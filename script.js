/* ==========================================
   AUTHORITY — DECISION INTELLIGENCE
   Engine v1.0
   ========================================== */

"use strict";

const Authority = (() => {

    const $ = (id) => document.getElementById(id);

    const form = $("decision-form");
    const analyzeButton = $("analyze-button");
    const resultsSection = $("results-section");

    const STOP_WORDS = new Set([
        "the", "and", "for", "that", "this", "with",
        "from", "have", "what", "when", "where", "would",
        "could", "should", "about", "into", "your", "you",
        "are", "was", "were", "will", "been", "being",
        "then", "than", "they", "them", "their", "there",
        "but", "not", "can", "all", "any", "its", "our",
        "out", "get", "got", "how", "why", "who", "which",
        "just", "like", "some", "more", "very", "really",
        "want", "need", "make", "made", "also", "because",
        "option", "choice", "decide", "decision", "thing",
        "things", "maybe", "might", "think", "know", "feel"
    ]);

    const KEYWORDS = {

        emotional: [
            "happy", "sad", "angry", "afraid", "fear",
            "anxious", "stress", "stressed", "guilt",
            "guilty", "lonely", "love", "hurt", "upset",
            "peace", "peaceful", "regret", "pressure",
            "embarrassed", "proud", "comfortable",
            "uncomfortable", "friendship", "relationship",
            "family", "trust", "respect", "feelings",
            "emotion", "emotional", "disappointed"
        ],

        practical: [
            "money", "cost", "time", "deadline", "exam",
            "study", "college", "school", "work", "job",
            "career", "marks", "result", "salary", "budget",
            "risk", "safe", "safety", "resource", "travel",
            "distance", "effort", "responsibility", "skill",
            "feasible", "practical", "schedule", "future",
            "opportunity", "consequence", "benefit"
        ],

        longterm: [
            "future", "career", "degree", "college",
            "education", "skill", "goal", "long-term",
            "permanent", "years", "growth", "progress",
            "opportunity", "consequence", "regret",
            "commitment", "relationship", "health"
        ],

        risk: [
            "risk", "danger", "unsafe", "uncertain",
            "uncertainty", "lose", "loss", "fail",
            "failure", "mistake", "consequence", "damage",
            "harm", "expensive", "debt", "emergency",
            "deadline", "pressure", "chance", "worried"
        ]

    };

    const CATEGORIES = {

        education: [
            "exam", "study", "college", "school",
            "marks", "teacher", "degree", "course",
            "education", "assignment", "homework",
            "semester", "university", "career"
        ],

        relationships: [
            "friend", "friendship", "relationship",
            "girlfriend", "boyfriend", "partner",
            "family", "parent", "trust", "love",
            "argument", "conversation", "social"
        ],

        money: [
            "money", "budget", "price", "cost",
            "purchase", "buy", "sell", "salary",
            "saving", "savings", "debt", "financial"
        ],

        personal: [
            "habit", "confidence", "fear", "growth",
            "goal", "identity", "motivation", "personal"
        ],

        time: [
            "time", "schedule", "busy", "deadline",
            "procrastination", "priority", "routine",
            "productive", "productivity"
        ],

        conflict: [
            "fight", "argument", "conflict", "insult",
            "disagreement", "confront", "confrontation",
            "apologize", "accusation", "blame"
        ],

        health: [
            "health", "doctor", "medicine", "sleep",
            "pain", "injury", "illness", "treatment",
            "medical", "wellbeing", "well-being"
        ]

    };


    /* ======================================
       BASIC UTILITIES
       ====================================== */

    function normalize(text) {
        return text
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function words(text) {
        return normalize(text)
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function containsKeyword(text, keyword) {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(
            "(^|[^\\p{L}\\p{N}])" +
            escaped +
            "($|[^\\p{L}\\p{N}])",
            "iu"
        ).test(text);
    }

    function countMatches(text, list) {
        return list.reduce(
            (total, keyword) =>
                total + (containsKeyword(text, keyword) ? 1 : 0),
            0
        );
    }

    function unique(values) {
        return [...new Set(values)];
    }


    /* ======================================
       INPUT VALIDATION
       ====================================== */

    function readInput() {

        const situation = $("situation").value.trim();
        const goal = $("goal").value.trim();
        const constraints = $("constraints").value.trim();
        const optionsText = $("options").value.trim();
        const category = $("category").value;
        const analysisDepth = $("analysis-depth").value;

        const priorities = Array.from(
            document.querySelectorAll(
                'input[name="priorities"]:checked'
            )
        ).map(input => input.value);

        if (situation.length < 20) {
            throw new Error(
                "Please describe your situation in at least 20 characters."
            );
        }

        if (situation.length > 10000) {
            throw new Error(
                "Your situation is too long. Please keep it under 10,000 characters."
            );
        }

        if (goal.length > 2000 || constraints.length > 3000) {
            throw new Error(
                "Your goal or constraints are too long. Please shorten them."
            );
        }

        if (optionsText.length > 5000) {
            throw new Error(
                "Please shorten your list of options."
            );
        }

        return {
            situation,
            goal,
            constraints,
            optionsText,
            category,
            analysisDepth,
            priorities
        };
    }


    /* ======================================
       SITUATION UNDERSTANDING
       ====================================== */

    function determineCategory(input) {

        if (input.category !== "automatic") {
            return input.category;
        }

        const text = normalize(
            input.situation + " " +
            input.goal + " " +
            input.constraints
        );

        let bestCategory = "other";
        let highestScore = 0;

        for (const [category, keywords] of Object.entries(CATEGORIES)) {

            const score = countMatches(text, keywords);

            if (score > highestScore) {
                highestScore = score;
                bestCategory = category;
            }
        }

        return bestCategory;
    }

    function getCategoryName(category) {

        const names = {
            education: "Education & Career",
            relationships: "Relationships & Social Life",
            money: "Money & Resources",
            personal: "Personal Growth",
            time: "Time & Productivity",
            conflict: "Conflict & Difficult Conversations",
            health: "Health & Well-being",
            other: "General Decision"
        };

        return names[category] || names.other;
    }

    function analyzeSignals(input) {

        const text = normalize(
            input.situation + " " +
            input.goal + " " +
            input.constraints
        );

        return {
            emotional: countMatches(
                text,
                KEYWORDS.emotional
            ),

            practical: countMatches(
                text,
                KEYWORDS.practical
            ),

            longterm: countMatches(
                text,
                KEYWORDS.longterm
            ),

            risk: countMatches(
                text,
                KEYWORDS.risk
            )
        };
    }


    /* ======================================
       OPTION GENERATION
       ====================================== */

    function parseOptions(optionsText) {

        if (!optionsText.trim()) {
            return [];
        }

        return unique(
            optionsText
                .split(/\n|;|\r/)
                .map(line =>
                    line
                        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
                        .trim()
                )
                .filter(Boolean)
        ).slice(0, 8);
    }

    function generateAlternatives(input, category) {

        const text = normalize(
            input.situation + " " +
            input.goal + " " +
            input.constraints
        );

        const alternatives = [
            {
                title: "Gather more information first",
                description:
                    "Identify the most important unknown and find a reliable way to answer it before committing."
            },
            {
                title: "Try a smaller, reversible step",
                description:
                    "Test the decision on a smaller scale before making a larger commitment, if doing so is safe and feasible."
            },
            {
                title: "Set a deadline for deciding",
                description:
                    "Choose a reasonable time to review the available evidence and make a decision rather than remaining stuck indefinitely."
            }
        ];

        if (
            category === "relationships" ||
            category === "conflict"
        ) {
            alternatives.push({
                title: "Have a calm, direct conversation",
                description:
                    "If it is safe and appropriate, clarify expectations, explain your perspective, and listen to the other person's."
            });
        }

        if (category === "education" || category === "time") {
            alternatives.push({
                title: "Create a short trial plan",
                description:
                    "Test the approach over a limited period and review the results before committing to it long-term."
            });
        }

        if (category === "money") {
            alternatives.push({
                title: "Compare the full costs",
                description:
                    "Consider total cost, alternatives, affordability, and what you would give up by choosing this option."
            });
        }

        if (category === "health") {
            alternatives.push({
                title: "Check reliable health guidance",
                description:
                    "For a health decision, seek appropriate medical guidance rather than relying on a general decision score."
            });
        }

        if (/\b(wait|delay|postpone|later)\b/.test(text)) {
            alternatives.push({
                title: "Compare waiting with acting now",
                description:
                    "Identify what waiting would improve and what opportunities or deadlines might be lost."
            });
        }

        return alternatives;
    }


    /* ======================================
       OPTION SCORING
       ====================================== */

    function assessOption(option, input, signals) {

        const text = normalize(
            option.title + " " + option.description
        );

        const practicalSignals = countMatches(
            text,
            KEYWORDS.practical
        );

        const emotionalSignals = countMatches(
            text,
            KEYWORDS.emotional
        );

        const riskSignals = countMatches(
            text,
            KEYWORDS.risk
        );

        const longtermSignals = countMatches(
            text,
            KEYWORDS.longterm
        );

        /*
         * This is a transparent heuristic, not an AI model.
         * Scores measure keyword-based alignment with selected
         * considerations. They do not predict actual success.
         */

        let practical = 50;
        let emotional = 50;
        let longterm = 50;
        let risk = 50;

        practical += Math.min(practicalSignals * 5, 15);
        emotional += Math.min(emotionalSignals * 5, 15);
        longterm += Math.min(longtermSignals * 5, 15);
        risk -= Math.min(riskSignals * 5, 15);

        practical = Math.max(0, Math.min(100, practical));
        emotional = Math.max(0, Math.min(100, emotional));
        longterm = Math.max(0, Math.min(100, longterm));
        risk = Math.max(0, Math.min(100, risk));

        const priorities = input.priorities.length
            ? input.priorities
            : ["emotional", "practical", "longterm", "risk"];

        const dimensions = {
            emotional,
            practical,
            longterm,
            risk
        };

        const score = Math.round(
            priorities.reduce(
                (sum, priority) => sum + dimensions[priority],
                0
            ) / priorities.length
        );

        return {
            ...option,
            score,
            practical,
            emotional,
            longterm,
            risk
        };
    }


    /* ======================================
       REASONING
       ====================================== */

    function summarizeSituation(input, category, signals) {

        const parts = [];

        parts.push(
            "This appears to be a " +
            getCategoryName(category).toLowerCase() +
            " decision."
        );

        if (input.goal) {
            parts.push(
                "Your stated goal is: " + input.goal + "."
            );
        } else {
            parts.push(
                "Your goal is not yet explicitly defined. " +
                "Clarifying what a good outcome looks like may help."
            );
        }

        if (input.constraints) {
            parts.push(
                "Your stated constraints need to be considered: " +
                input.constraints
            );
        }

        if (signals.emotional > signals.practical) {
            parts.push(
                "Your description contains more emotional-related " +
                "signals than practical-related signals. This is only " +
                "a keyword observation, not a reliable assessment of " +
                "your feelings."
            );
        } else if (signals.practical > signals.emotional) {
            parts.push(
                "Your description contains more practical-related " +
                "signals than emotional-related signals. This does " +
                "not establish which side matters more to you."
            );
        } else {
            parts.push(
                "The initial keyword scan does not establish whether " +
                "emotional or practical factors dominate."
            );
        }

        return parts.join(" ");
    }

    function recommendAction(options, input, category) {

        if (!options.length) {
            return {
                title: "Clarify the available choices",
                reason:
                    "There is not enough information to compare concrete " +
                    "options responsibly. Define your goal, identify " +
                    "realistic alternatives, and note the most important " +
                    "consequences before choosing."
            };
        }

        const ranked = [...options].sort(
            (a, b) => b.score - a.score
        );

        const best = ranked[0];

        let reason =
            "This option scores highest under the current preliminary " +
            "keyword-based model. Its score is not a probability of " +
            "success, and the model has not established that it is " +
            "objectively the best choice.";

        if (ranked.length > 1) {

            const difference = best.score - ranked[1].score;

            if (difference <= 5) {
                reason +=
                    " The leading options are effectively tied under " +
                    "this simple scoring system. Their actual trade-offs " +
                    "need closer examination.";
            }
        }

        if (input.goal) {
            reason +=
                " Compare the option against your stated goal: " +
                input.goal + ".";
        }

        if (category === "health") {
            reason +=
                " Because this involves health, do not use this ranking " +
                "to replace professional medical advice.";
        }

        return {
            title: best.title,
            reason
        };
    }

    function buildBlindSpots(input, category, signals) {

        const insights = [];

        if (!input.goal) {
            insights.push(
                "Your desired outcome is unclear. What would a successful result look like?"
            );
        }

        if (!input.constraints) {
            insights.push(
                "You haven't listed your constraints. Time, resources, obligations, and risks may change which options are realistic."
            );
        }

        if (!input.optionsText.trim()) {
            insights.push(
                "No personal options were provided. The alternatives shown are general suggestions, not conclusions based on a complete understanding of your situation."
            );
        }

        if (signals.risk > 0) {
            insights.push(
                "Examine the downside of each option. Consider what happens if your assumptions are wrong."
            );
        }

        if (signals.longterm === 0) {
            insights.push(
                "Consider whether the decision has long-term consequences that aren't apparent today."
            );
        }

        if (category === "relationships" || category === "conflict") {
            insights.push(
                "Consider the other person's perspective without assuming you know their intentions."
            );
        }

        if (category === "money") {
            insights.push(
                "Check affordability, opportunity cost, and whether you can reverse the decision."
            );
        }

        if (category === "health") {
            insights.push(
                "A general-purpose algorithm cannot assess your medical condition. Seek qualified medical guidance when appropriate."
            );
        }

        if (!insights.length) {
            insights.push(
                "Check your assumptions, consider an alternative explanation, and identify what new information could change your decision."
            );
        }

        return unique(insights).slice(0, 5);
    }

    function suggestNextStep(input, options) {

        if (!input.goal) {
            return "Write one sentence describing the outcome you want. If you are unsure, describe what you most want to avoid.";
        }

        if (!input.constraints) {
            return "List your main constraints and the consequences you would find hardest to accept.";
        }

        if (!options.length) {
            return "Write down at least two realistic options, including doing nothing or waiting if that is genuinely available.";
        }

        return "Choose the most important unresolved question in your analysis. Find reliable information about it, then compare the options again before committing.";
    }


    /* ======================================
       RENDERING
       ====================================== */

    function renderOptions(options) {

        const container = $("option-results");

        container.replaceChildren();

        if (!options.length) {
            const message = document.createElement("p");

            message.className = "empty-state";
            message.textContent =
                "No options available to compare yet.";

            container.appendChild(message);
            return;
        }

        options.forEach(option => {

            const card = document.createElement("article");
            card.className = "option-card";

            const heading = document.createElement("h4");
            heading.textContent = option.title;

            const score = document.createElement("div");
            score.className = "option-score";
            score.textContent =
                "Preliminary alignment: " + option.score + "/100";

            const track = document.createElement("div");
            track.className = "score-track";

            const fill = document.createElement("div");
            fill.className = "score-fill";
            fill.style.width = option.score + "%";

            track.appendChild(fill);

            const practical = document.createElement("p");
            practical.textContent =
                "Practical: " + option.practical +
                "/100 · Emotional: " + option.emotional +
                "/100";

            const longterm = document.createElement("p");
            longterm.textContent =
                "Long-term: " + option.longterm +
                "/100 · Risk consideration: " + option.risk +
                "/100";

            card.append(
                heading,
                score,
                track,
                practical,
                longterm
            );

            container.appendChild(card);
        });
    }

    function renderInsights(insights) {

        const list = $("result-blind-spots");

        list.replaceChildren();

        insights.forEach(insight => {

            const item = document.createElement("li");
            item.textContent = insight;

            list.appendChild(item);
        });
    }

    function renderAnalysis(input, category, signals, options) {

        const summary = summarizeSituation(
            input,
            category,
            signals
        );

        const recommendation = recommendAction(
            options,
            input,
            category
        );

        $("result-summary").textContent = summary;

        $("result-recommendation").textContent =
            recommendation.title;

        $("result-reason").textContent =
            recommendation.reason;

        $("result-emotional").textContent =
            "The current rule-based scan found " +
            signals.emotional +
            " emotional-related keyword matches. " +
            "This cannot determine your true emotional state. " +
            "Reflect on your feelings, values, boundaries, " +
            "and the emotional costs of each option.";

        $("result-practical").textContent =
            "The current rule-based scan found " +
            signals.practical +
            " practical-related keyword matches. " +
            "This cannot establish feasibility. Compare real costs, " +
            "time, available resources, consequences, and evidence.";

        $("result-next-step").textContent =
            suggestNextStep(input, options);

        renderOptions(options);

        renderInsights(
            buildBlindSpots(input, category, signals)
        );

        $("analysis-status").textContent =
            "PRELIMINARY RULE-BASED ANALYSIS · " +
            getCategoryName(category).toUpperCase();

        resultsSection.hidden = false;

        resultsSection.scrollIntoView({
            behavior: window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches ? "auto" : "smooth",
            block: "start"
        });
    }


    /* ======================================
       MAIN ENGINE
       ====================================== */

    function analyze(input) {

        const category = determineCategory(input);
        const signals = analyzeSignals(input);

        let options = parseOptions(input.optionsText);

        if (!options.length) {
            options = generateAlternatives(input, category);
        }

        const assessed = options.map(option =>
            assessOption(
                {
                    title: option,
                    description: ""
                },
                input,
                signals
            )
        );

        const ranked = assessed.sort(
            (a, b) => b.score - a.score
        );

        renderAnalysis(
            input,
            category,
            signals,
            ranked
        );
    }


    /* ======================================
       EVENTS
       ====================================== */

    function updateCharacterCount() {

        const length = $("situation").value.length;

        $("situation-count").textContent =
            length + (length === 1 ? " character" : " characters");
    }

    $("situation").addEventListener(
        "input",
        updateCharacterCount
    );

    form.addEventListener("submit", event => {

        event.preventDefault();

        analyzeButton.disabled = true;

        const originalText =
            analyzeButton.querySelector("span").textContent;

        analyzeButton.querySelector("span").textContent =
            "ANALYZING...";

        try {

            const input = readInput();

            analyze(input);

        } catch (error) {

            window.alert(error.message);

        } finally {

            analyzeButton.disabled = false;

            analyzeButton.querySelector("span").textContent =
                originalText;
        }
    });

    $("revise-button").addEventListener("click", () => {

        $("situation").focus();

        $("situation").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });

    $("reset-button").addEventListener("click", () => {

        form.reset();

        updateCharacterCount();

        resultsSection.hidden = true;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });


    /* ======================================
       PUBLIC API
       ====================================== */

    return {
        analyze,
        readInput
    };

})();
