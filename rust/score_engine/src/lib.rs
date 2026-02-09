// rust/score_engine/src/lib.rs
// Enhanced Decision Intelligence Score Engine
// Features: Validation, Monte Carlo Simulation, Sensitivity Analysis, NLP Scoring

mod wasm;

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// CORE SCORING TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreResult {
    pub score: u32,
    pub must_repair: bool,
    pub finish_reason_hint: String,

    pub missing_headers: Vec<String>,
    pub empty_sections: Vec<String>,
    pub duplicate_headers: Vec<String>,

    pub next_actions_count: usize,
    pub next_actions_ok: bool,

    pub truncation_suspected: bool,
    pub notes: Vec<String>,
    
    pub quality_metrics: QualityMetrics,
    pub confidence_interval: ConfidenceInterval,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct QualityMetrics {
    pub clarity_score: f64,
    pub specificity_score: f64,
    pub actionability_score: f64,
    pub completeness_score: f64,
    pub overall_quality: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ConfidenceInterval {
    pub lower_bound: f64,
    pub upper_bound: f64,
    pub confidence_level: f64,
}

#[derive(Debug, Clone)]
pub struct ScoringConfig {
    pub required_headers: Vec<&'static str>,
    pub min_next_actions: usize,
    pub enable_quality_metrics: bool,
    pub enable_monte_carlo: bool,
}

impl Default for ScoringConfig {
    fn default() -> Self {
        Self {
            required_headers: vec![
                "BEST OPTION",
                "RATIONALE",
                "TOP RISKS",
                "ASSUMPTIONS TO VALIDATE",
                "HALF-LIFE",
                "BLIND SPOTS",
                "NEXT ACTIONS",
            ],
            min_next_actions: 6,
            enable_quality_metrics: true,
            enable_monte_carlo: true,
        }
    }
}

// ============================================================================
// MONTE CARLO SIMULATION TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonteCarloConfig {
    pub iterations: usize,
    pub seed: Option<u64>,
    pub confidence_level: f64,
}

impl Default for MonteCarloConfig {
    fn default() -> Self {
        Self {
            iterations: 10000,
            seed: None,
            confidence_level: 0.95,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonteCarloResult {
    pub mean_score: f64,
    pub std_dev: f64,
    pub min_score: f64,
    pub max_score: f64,
    pub percentile_5: f64,
    pub percentile_25: f64,
    pub percentile_50: f64,
    pub percentile_75: f64,
    pub percentile_95: f64,
    pub confidence_interval: ConfidenceInterval,
    pub risk_of_failure: f64,
    pub iterations_run: usize,
    pub scenario_distribution: Vec<ScenarioOutcome>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioOutcome {
    pub scenario_name: String,
    pub probability: f64,
    pub score_impact: f64,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskFactor {
    pub name: String,
    pub probability: f64,
    pub impact_low: f64,
    pub impact_high: f64,
    pub category: RiskCategory,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RiskCategory {
    Technical,
    Market,
    Financial,
    Operational,
    Strategic,
    External,
}

// ============================================================================
// SENSITIVITY ANALYSIS TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SensitivityConfig {
    pub variables: Vec<SensitivityVariable>,
    pub step_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SensitivityVariable {
    pub name: String,
    pub base_value: f64,
    pub min_value: f64,
    pub max_value: f64,
    pub weight: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SensitivityResult {
    pub variable_impacts: Vec<VariableImpact>,
    pub tornado_chart_data: Vec<TornadoBar>,
    pub critical_variables: Vec<String>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariableImpact {
    pub variable_name: String,
    pub elasticity: f64,
    pub correlation: f64,
    pub score_at_min: f64,
    pub score_at_max: f64,
    pub score_range: f64,
    pub is_critical: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TornadoBar {
    pub variable_name: String,
    pub low_value: f64,
    pub high_value: f64,
    pub base_value: f64,
    pub low_score: f64,
    pub high_score: f64,
}

// ============================================================================
// DECISION DECAY / HALF-LIFE TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionDecayConfig {
    pub initial_confidence: f64,
    pub decay_factors: Vec<DecayFactor>,
    pub time_horizon_days: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecayFactor {
    pub name: String,
    pub decay_rate: f64,
    pub volatility: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionDecayResult {
    pub half_life_days: f64,
    pub confidence_timeline: Vec<ConfidencePoint>,
    pub critical_review_date: String,
    pub decay_classification: DecayClassification,
    pub stability_score: f64,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidencePoint {
    pub day: u32,
    pub confidence: f64,
    pub upper_bound: f64,
    pub lower_bound: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DecayClassification {
    Stable,       // Half-life > 180 days
    Moderate,     // Half-life 60-180 days
    Volatile,     // Half-life 14-60 days
    Critical,     // Half-life < 14 days
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/// Main entry used by the WASM wrapper.
/// Deterministic validator/scorer for decision-grade report template.
pub fn score_report_text(input: &str, cfg: ScoringConfig) -> ScoreResult {
    let cleaned = clean_model_text(input);
    let norm = normalize_for_headers(&cleaned);

    let (missing_headers, duplicate_headers, empty_sections) =
        evaluate_headers(&norm, &cfg.required_headers);

    let next_actions_count = count_next_actions(&norm);
    let next_actions_ok = next_actions_count >= cfg.min_next_actions;

    let truncation_suspected = looks_truncated(&cleaned);

    // Scoring: start at 100, subtract penalties deterministically.
    let mut score: i32 = 100;
    let mut notes: Vec<String> = Vec::new();

    if !missing_headers.is_empty() {
        let p = (missing_headers.len() as i32) * 12;
        score -= p;
        notes.push(format!("Missing headers penalty: -{}", p));
    }

    if !empty_sections.is_empty() {
        let p = (empty_sections.len() as i32) * 8;
        score -= p;
        notes.push(format!("Empty sections penalty: -{}", p));
    }

    if !duplicate_headers.is_empty() {
        let p = (duplicate_headers.len() as i32) * 6;
        score -= p;
        notes.push(format!("Duplicate headers penalty: -{}", p));
    }

    if !next_actions_ok {
        let deficit = (cfg.min_next_actions as i32) - (next_actions_count as i32);
        let p = 10 + (deficit.max(0) * 3);
        score -= p;
        notes.push(format!(
            "NEXT ACTIONS count too low ({}), penalty: -{}",
            next_actions_count, p
        ));
    }

    if truncation_suspected {
        score -= 12;
        notes.push("Truncation suspected penalty: -12".to_string());
    }

    score = score.clamp(0, 100);

    // Calculate quality metrics if enabled
    let quality_metrics = if cfg.enable_quality_metrics {
        calculate_quality_metrics(&cleaned)
    } else {
        QualityMetrics::default()
    };

    // Calculate confidence interval
    let confidence_interval = calculate_confidence_interval(score as f64, &quality_metrics);

    // Must-repair rule
    let must_repair =
        !missing_headers.is_empty() || !next_actions_ok || (truncation_suspected && score < 92);

    let finish_reason_hint = if truncation_suspected {
        "LIKELY_TRUNCATED".to_string()
    } else if must_repair {
        "INCOMPLETE_STRUCTURE".to_string()
    } else {
        "OK".to_string()
    };

    ScoreResult {
        score: score as u32,
        must_repair,
        finish_reason_hint,
        missing_headers,
        empty_sections,
        duplicate_headers,
        next_actions_count,
        next_actions_ok,
        truncation_suspected,
        notes,
        quality_metrics,
        confidence_interval,
    }
}

// ============================================================================
// QUALITY METRICS CALCULATION
// ============================================================================

fn calculate_quality_metrics(text: &str) -> QualityMetrics {
    let clarity_score = calculate_clarity_score(text);
    let specificity_score = calculate_specificity_score(text);
    let actionability_score = calculate_actionability_score(text);
    let completeness_score = calculate_completeness_score(text);
    
    let overall_quality = (clarity_score * 0.25) 
        + (specificity_score * 0.30) 
        + (actionability_score * 0.25) 
        + (completeness_score * 0.20);

    QualityMetrics {
        clarity_score,
        specificity_score,
        actionability_score,
        completeness_score,
        overall_quality,
    }
}

fn calculate_clarity_score(text: &str) -> f64 {
    let words: Vec<&str> = text.split_whitespace().collect();
    let word_count = words.len() as f64;
    
    if word_count == 0.0 {
        return 0.0;
    }

    // Sentence count (approximate)
    let sentence_count = text.matches('.').count() 
        + text.matches('!').count() 
        + text.matches('?').count();
    let sentence_count = (sentence_count as f64).max(1.0);

    // Average sentence length (lower is clearer, up to a point)
    let avg_sentence_length = word_count / sentence_count;
    
    // Ideal range: 12-20 words per sentence
    let length_score = if avg_sentence_length < 8.0 {
        0.6 + (avg_sentence_length / 8.0) * 0.2
    } else if avg_sentence_length <= 20.0 {
        0.8 + ((20.0 - avg_sentence_length) / 12.0) * 0.2
    } else {
        0.8 - ((avg_sentence_length - 20.0) / 30.0).min(0.4)
    };

    // Check for bullet points and structure (good for clarity)
    let has_bullets = text.contains("- ") || text.contains("* ") || text.contains("• ");
    let structure_bonus = if has_bullets { 0.1 } else { 0.0 };

    (length_score + structure_bonus).min(1.0)
}

fn calculate_specificity_score(text: &str) -> f64 {
    let lower = text.to_lowercase();
    
    // Vague words that reduce specificity
    let vague_words = [
        "some", "many", "few", "various", "several", "often", "sometimes",
        "might", "could", "possibly", "perhaps", "generally", "usually",
        "significant", "considerable", "substantial"
    ];
    
    // Specific indicators
    let specific_patterns = [
        r"\d+%",           // Percentages
        r"\$[\d,]+",       // Dollar amounts
        r"\d+ (days?|weeks?|months?|years?)", // Time durations
        r"\d{4}-\d{2}-\d{2}", // Dates
        r"Q[1-4] \d{4}",   // Quarters
        r"\d+:\d+",        // Times
    ];

    let words: Vec<&str> = lower.split_whitespace().collect();
    let word_count = words.len() as f64;
    
    if word_count == 0.0 {
        return 0.0;
    }

    // Count vague words
    let vague_count: usize = vague_words.iter()
        .map(|w| lower.matches(w).count())
        .sum();
    
    let vague_penalty = (vague_count as f64 / word_count * 10.0).min(0.3);

    // Count specific patterns
    let mut specific_count = 0;
    for pattern in &specific_patterns {
        if let Ok(re) = Regex::new(pattern) {
            specific_count += re.find_iter(text).count();
        }
    }
    
    let specific_bonus = (specific_count as f64 * 0.05).min(0.3);

    (0.7 - vague_penalty + specific_bonus).clamp(0.0, 1.0)
}

fn calculate_actionability_score(text: &str) -> f64 {
    let lower = text.to_lowercase();
    
    // Action verbs that indicate actionability
    let action_verbs = [
        "implement", "execute", "deploy", "launch", "create", "build",
        "develop", "establish", "initiate", "complete", "deliver", "achieve",
        "schedule", "assign", "review", "analyze", "evaluate", "measure",
        "track", "monitor", "verify", "validate", "test", "approve"
    ];
    
    // Owner indicators
    let owner_patterns = [
        "owner:", "assigned to", "responsible:", "lead:", "by:"
    ];
    
    // Timeline indicators
    let timeline_patterns = [
        "by", "before", "within", "deadline", "due", "target date"
    ];

    let words: Vec<&str> = lower.split_whitespace().collect();
    let word_count = words.len() as f64;
    
    if word_count == 0.0 {
        return 0.0;
    }

    // Count action verbs
    let action_count: usize = action_verbs.iter()
        .map(|w| lower.matches(w).count())
        .sum();
    
    let action_score = (action_count as f64 * 0.1).min(0.4);

    // Check for owners
    let has_owners = owner_patterns.iter().any(|p| lower.contains(p));
    let owner_bonus = if has_owners { 0.2 } else { 0.0 };

    // Check for timelines
    let has_timelines = timeline_patterns.iter().any(|p| lower.contains(p));
    let timeline_bonus = if has_timelines { 0.2 } else { 0.0 };

    (0.2 + action_score + owner_bonus + timeline_bonus).min(1.0)
}

fn calculate_completeness_score(text: &str) -> f64 {
    let upper = text.to_uppercase();
    
    // Check for key sections
    let key_sections = [
        ("BEST OPTION", 0.15),
        ("RATIONALE", 0.15),
        ("RISKS", 0.15),
        ("ASSUMPTIONS", 0.15),
        ("HALF-LIFE", 0.10),
        ("BLIND SPOTS", 0.10),
        ("NEXT ACTIONS", 0.20),
    ];

    let mut score = 0.0;
    for (section, weight) in &key_sections {
        if upper.contains(section) {
            score += weight;
        }
    }

    score
}

fn calculate_confidence_interval(score: f64, metrics: &QualityMetrics) -> ConfidenceInterval {
    // Use quality metrics to determine confidence interval width
    let uncertainty = 1.0 - metrics.overall_quality;
    let margin = uncertainty * 15.0; // Max margin of 15 points
    
    ConfidenceInterval {
        lower_bound: (score - margin).max(0.0),
        upper_bound: (score + margin).min(100.0),
        confidence_level: 0.95,
    }
}

// ============================================================================
// MONTE CARLO SIMULATION
// ============================================================================

/// Run Monte Carlo simulation for risk assessment
pub fn run_monte_carlo_simulation(
    base_score: f64,
    risks: &[RiskFactor],
    config: MonteCarloConfig,
) -> MonteCarloResult {
    use std::collections::BinaryHeap;
    use std::cmp::Reverse;

    let mut results: Vec<f64> = Vec::with_capacity(config.iterations);
    
    // Simple LCG random number generator (deterministic if seed provided)
    let mut rng_state: u64 = config.seed.unwrap_or(12345);
    let lcg_next = |state: &mut u64| -> f64 {
        *state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        (*state as f64) / (u64::MAX as f64)
    };

    // Run simulations
    for _ in 0..config.iterations {
        let mut sim_score = base_score;
        
        for risk in risks {
            let random_val = lcg_next(&mut rng_state);
            
            // Check if risk materializes
            if random_val < risk.probability {
                // Risk occurred - apply impact
                let impact_range = risk.impact_high - risk.impact_low;
                let impact_val = lcg_next(&mut rng_state);
                let actual_impact = risk.impact_low + (impact_range * impact_val);
                sim_score -= actual_impact;
            }
        }
        
        results.push(sim_score.clamp(0.0, 100.0));
    }

    // Sort results for percentile calculation
    results.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    // Calculate statistics
    let n = results.len() as f64;
    let mean_score: f64 = results.iter().sum::<f64>() / n;
    
    let variance: f64 = results.iter()
        .map(|x| (x - mean_score).powi(2))
        .sum::<f64>() / n;
    let std_dev = variance.sqrt();

    let min_score = results.first().copied().unwrap_or(0.0);
    let max_score = results.last().copied().unwrap_or(100.0);

    // Percentiles
    let percentile = |p: f64| -> f64 {
        let idx = ((p / 100.0) * (results.len() - 1) as f64).round() as usize;
        results.get(idx).copied().unwrap_or(50.0)
    };

    let percentile_5 = percentile(5.0);
    let percentile_25 = percentile(25.0);
    let percentile_50 = percentile(50.0);
    let percentile_75 = percentile(75.0);
    let percentile_95 = percentile(95.0);

    // Confidence interval
    let ci_lower = percentile((1.0 - config.confidence_level) / 2.0 * 100.0);
    let ci_upper = percentile((1.0 + config.confidence_level) / 2.0 * 100.0);

    // Risk of failure (score < 60)
    let failure_count = results.iter().filter(|&&s| s < 60.0).count();
    let risk_of_failure = failure_count as f64 / n;

    // Scenario distribution
    let scenario_distribution = categorize_scenarios(&results);

    MonteCarloResult {
        mean_score,
        std_dev,
        min_score,
        max_score,
        percentile_5,
        percentile_25,
        percentile_50,
        percentile_75,
        percentile_95,
        confidence_interval: ConfidenceInterval {
            lower_bound: ci_lower,
            upper_bound: ci_upper,
            confidence_level: config.confidence_level,
        },
        risk_of_failure,
        iterations_run: config.iterations,
        scenario_distribution,
    }
}

fn categorize_scenarios(results: &[f64]) -> Vec<ScenarioOutcome> {
    let n = results.len() as f64;
    
    let excellent = results.iter().filter(|&&s| s >= 90.0).count();
    let good = results.iter().filter(|&&s| s >= 75.0 && s < 90.0).count();
    let acceptable = results.iter().filter(|&&s| s >= 60.0 && s < 75.0).count();
    let poor = results.iter().filter(|&&s| s >= 40.0 && s < 60.0).count();
    let failure = results.iter().filter(|&&s| s < 40.0).count();

    vec![
        ScenarioOutcome {
            scenario_name: "Excellent".to_string(),
            probability: excellent as f64 / n,
            score_impact: 0.0,
            description: "Decision achieves all objectives with minimal issues".to_string(),
        },
        ScenarioOutcome {
            scenario_name: "Good".to_string(),
            probability: good as f64 / n,
            score_impact: -10.0,
            description: "Decision succeeds with minor adjustments needed".to_string(),
        },
        ScenarioOutcome {
            scenario_name: "Acceptable".to_string(),
            probability: acceptable as f64 / n,
            score_impact: -25.0,
            description: "Decision achieves basic objectives but with challenges".to_string(),
        },
        ScenarioOutcome {
            scenario_name: "Poor".to_string(),
            probability: poor as f64 / n,
            score_impact: -45.0,
            description: "Decision faces significant obstacles, requires revision".to_string(),
        },
        ScenarioOutcome {
            scenario_name: "Failure".to_string(),
            probability: failure as f64 / n,
            score_impact: -70.0,
            description: "Decision likely to fail without major intervention".to_string(),
        },
    ]
}

// ============================================================================
// SENSITIVITY ANALYSIS
// ============================================================================

/// Run sensitivity analysis on decision variables
pub fn run_sensitivity_analysis(
    base_score: f64,
    config: SensitivityConfig,
) -> SensitivityResult {
    let mut variable_impacts: Vec<VariableImpact> = Vec::new();
    let mut tornado_chart_data: Vec<TornadoBar> = Vec::new();

    for var in &config.variables {
        let step_size = (var.max_value - var.min_value) / config.step_count as f64;
        let mut scores_at_values: Vec<(f64, f64)> = Vec::new();

        // Calculate score at each step
        for i in 0..=config.step_count {
            let value = var.min_value + (step_size * i as f64);
            let delta = (value - var.base_value) / var.base_value;
            let score_impact = delta * var.weight * 20.0; // Scaled impact
            let score = (base_score + score_impact).clamp(0.0, 100.0);
            scores_at_values.push((value, score));
        }

        // Calculate elasticity (% change in score / % change in variable)
        let score_at_min = scores_at_values.first().map(|(_, s)| *s).unwrap_or(base_score);
        let score_at_max = scores_at_values.last().map(|(_, s)| *s).unwrap_or(base_score);
        let score_range = score_at_max - score_at_min;
        
        let pct_change_score = (score_range / base_score) * 100.0;
        let pct_change_var = ((var.max_value - var.min_value) / var.base_value) * 100.0;
        let elasticity = if pct_change_var != 0.0 {
            pct_change_score / pct_change_var
        } else {
            0.0
        };

        // Correlation (simplified: positive if high value = high score)
        let correlation = if score_at_max > score_at_min { 1.0 } else { -1.0 };

        // Is critical if elasticity > 0.5 or score range > 15
        let is_critical = elasticity.abs() > 0.5 || score_range.abs() > 15.0;

        variable_impacts.push(VariableImpact {
            variable_name: var.name.clone(),
            elasticity,
            correlation,
            score_at_min,
            score_at_max,
            score_range,
            is_critical,
        });

        tornado_chart_data.push(TornadoBar {
            variable_name: var.name.clone(),
            low_value: var.min_value,
            high_value: var.max_value,
            base_value: var.base_value,
            low_score: score_at_min,
            high_score: score_at_max,
        });
    }

    // Sort tornado chart by score range (largest first)
    tornado_chart_data.sort_by(|a, b| {
        let range_a = (a.high_score - a.low_score).abs();
        let range_b = (b.high_score - b.low_score).abs();
        range_b.partial_cmp(&range_a).unwrap_or(std::cmp::Ordering::Equal)
    });

    // Critical variables
    let critical_variables: Vec<String> = variable_impacts.iter()
        .filter(|v| v.is_critical)
        .map(|v| v.variable_name.clone())
        .collect();

    // Generate recommendations
    let recommendations = generate_sensitivity_recommendations(&variable_impacts);

    SensitivityResult {
        variable_impacts,
        tornado_chart_data,
        critical_variables,
        recommendations,
    }
}

fn generate_sensitivity_recommendations(impacts: &[VariableImpact]) -> Vec<String> {
    let mut recommendations: Vec<String> = Vec::new();

    for impact in impacts {
        if impact.is_critical {
            if impact.correlation > 0.0 {
                recommendations.push(format!(
                    "Focus on maximizing '{}' - positive correlation with decision success",
                    impact.variable_name
                ));
            } else {
                recommendations.push(format!(
                    "Minimize exposure to '{}' - negative correlation with decision success",
                    impact.variable_name
                ));
            }
        }

        if impact.elasticity.abs() > 1.0 {
            recommendations.push(format!(
                "High sensitivity to '{}' (elasticity: {:.2}) - small changes have large effects",
                impact.variable_name, impact.elasticity
            ));
        }
    }

    if recommendations.is_empty() {
        recommendations.push("Decision appears robust to variable changes".to_string());
    }

    recommendations
}

// ============================================================================
// DECISION DECAY ANALYSIS
// ============================================================================

/// Calculate decision decay and half-life
pub fn calculate_decision_decay(config: DecisionDecayConfig) -> DecisionDecayResult {
    let mut confidence_timeline: Vec<ConfidencePoint> = Vec::new();
    let mut current_confidence = config.initial_confidence;
    let mut half_life_days: f64 = 0.0;
    let mut half_life_found = false;

    // Calculate aggregate decay rate
    let total_decay_rate: f64 = config.decay_factors.iter()
        .map(|f| f.decay_rate)
        .sum::<f64>() / config.decay_factors.len() as f64;

    let total_volatility: f64 = config.decay_factors.iter()
        .map(|f| f.volatility)
        .sum::<f64>() / config.decay_factors.len() as f64;

    // Generate timeline
    for day in 0..=config.time_horizon_days {
        let decay = (-(total_decay_rate * day as f64 / 100.0)).exp();
        current_confidence = config.initial_confidence * decay;

        let volatility_margin = total_volatility * (day as f64).sqrt() / 10.0;
        
        confidence_timeline.push(ConfidencePoint {
            day,
            confidence: current_confidence,
            upper_bound: (current_confidence + volatility_margin).min(100.0),
            lower_bound: (current_confidence - volatility_margin).max(0.0),
        });

        // Find half-life
        if !half_life_found && current_confidence <= config.initial_confidence / 2.0 {
            half_life_days = day as f64;
            half_life_found = true;
        }
    }

    // If half-life not reached, extrapolate
    if !half_life_found {
        half_life_days = (0.693 / (total_decay_rate / 100.0)).abs();
    }

    // Classify decay
    let decay_classification = if half_life_days > 180.0 {
        DecayClassification::Stable
    } else if half_life_days > 60.0 {
        DecayClassification::Moderate
    } else if half_life_days > 14.0 {
        DecayClassification::Volatile
    } else {
        DecayClassification::Critical
    };

    // Stability score (0-100)
    let stability_score = (half_life_days / 365.0 * 100.0).min(100.0);

    // Critical review date
    let critical_review_date = format!("{} days from now", (half_life_days * 0.5).round() as u32);

    // Recommendations
    let recommendations = generate_decay_recommendations(&decay_classification, half_life_days);

    DecisionDecayResult {
        half_life_days,
        confidence_timeline,
        critical_review_date,
        decay_classification,
        stability_score,
        recommendations,
    }
}

fn generate_decay_recommendations(classification: &DecayClassification, half_life: f64) -> Vec<String> {
    let mut recs = Vec::new();

    match classification {
        DecayClassification::Critical => {
            recs.push("URGENT: Decision has very short validity window".to_string());
            recs.push(format!("Schedule review within {} days", (half_life * 0.3).round() as u32));
            recs.push("Consider if decision can be made more stable".to_string());
        }
        DecayClassification::Volatile => {
            recs.push("Decision requires frequent monitoring".to_string());
            recs.push(format!("Plan for review every {} days", (half_life * 0.4).round() as u32));
            recs.push("Identify key assumptions that drive volatility".to_string());
        }
        DecayClassification::Moderate => {
            recs.push("Decision has reasonable stability".to_string());
            recs.push(format!("Schedule quarterly review (every {} days)", (half_life * 0.5).round() as u32));
        }
        DecayClassification::Stable => {
            recs.push("Decision is highly stable".to_string());
            recs.push("Annual review recommended".to_string());
            recs.push("Monitor for black swan events that could invalidate assumptions".to_string());
        }
    }

    recs
}

// ============================================================================
// TEXT PROCESSING HELPERS
// ============================================================================

fn clean_model_text(s: &str) -> String {
    let mut out = s.replace("\r\n", "\n");

    out = out.replace("```", "");

    let re_md_head = Regex::new(r"(?m)^\s{0,3}#{1,6}\s+").unwrap();
    out = re_md_head.replace_all(&out, "").to_string();

    let re_sep = Regex::new(r"(?m)^\s*[-=_]{3,}\s*$").unwrap();
    out = re_sep.replace_all(&out, "").to_string();

    out = out
        .lines()
        .map(|l| l.trim_end().to_string())
        .collect::<Vec<_>>()
        .join("\n");

    out.trim().to_string()
}

fn normalize_for_headers(s: &str) -> String {
    let mut out = s.to_string();

    out = out.replace("•", "- ");
    out = out.replace("–", "- ");
    out = out.replace("—", "- ");

    let re_colon = Regex::new(r"(?m)^\s*([A-Z][A-Z0-9 \-]{2,})\s*:\s*$").unwrap();
    out = re_colon.replace_all(&out, "$1:").to_string();

    out.to_uppercase()
}

fn evaluate_headers(
    normalized_upper: &str,
    required: &[&str],
) -> (Vec<String>, Vec<String>, Vec<String>) {
    let mut missing: Vec<String> = Vec::new();
    let mut dupes: Vec<String> = Vec::new();
    let mut empty: Vec<String> = Vec::new();

    let bullet_re = Regex::new(r"(?m)^\s*[-*]\s+\S+").unwrap();
    let num_re = Regex::new(r"(?m)^\s*\d{1,2}[\.\)]\s+\S+").unwrap();
    let word_re = Regex::new(r"[A-Z0-9]{2,}").unwrap();

    for &h in required {
        let header_re = Regex::new(&format!(r"(?m)^\s*{}\s*:?\s*$", regex::escape(h))).unwrap();
        let matches: Vec<_> = header_re.find_iter(normalized_upper).collect();

        if matches.is_empty() {
            missing.push(h.to_string());
            continue;
        }
        if matches.len() > 1 {
            dupes.push(h.to_string());
        }

        let first = matches[0].end();
        let after = &normalized_upper[first..];

        let next_header_re = Regex::new(&format!(
            r"(?m)^\s*({})\s*:?\s*$",
            required
                .iter()
                .map(|x| regex::escape(x))
                .collect::<Vec<_>>()
                .join("|")
        ))
        .unwrap();

        let end_idx = next_header_re
            .find(after)
            .map(|m| m.start())
            .unwrap_or(after.len());

        let section = after[..end_idx].trim();

        if section.is_empty() || section == ":" {
            empty.push(h.to_string());
            continue;
        }

        let has_list_item = bullet_re.is_match(section) || num_re.is_match(section);
        let word_count = word_re.find_iter(section).count();

        if !has_list_item && word_count < 1 {
            empty.push(h.to_string());
        }
    }

    (missing, dupes, empty)
}

fn count_next_actions(normalized_upper: &str) -> usize {
    let header_re = Regex::new(r"(?m)^\s*NEXT ACTIONS\s*:?\s*$").unwrap();
    let m = match header_re.find(normalized_upper) {
        Some(x) => x,
        None => return 0,
    };

    let after = &normalized_upper[m.end()..];

    let stop_re = Regex::new(
        r"(?m)^\s*(BEST OPTION|RATIONALE|TOP RISKS|ASSUMPTIONS TO VALIDATE|ASSUMPTIONS|HALF-LIFE|BLIND SPOTS)\s*:?\s*$",
    )
    .unwrap();

    let end_idx = stop_re
        .find(after)
        .map(|x| x.start())
        .unwrap_or(after.len());

    let section = after[..end_idx].trim();
    if section.is_empty() {
        return 0;
    }

    let bullet_re = Regex::new(r"(?m)^\s*[-*]\s+\S+").unwrap();
    let num_re = Regex::new(r"(?m)^\s*\d{1,2}[\.\)]\s+\S+").unwrap();

    let bullets = bullet_re.find_iter(section).count();
    let nums = num_re.find_iter(section).count();

    bullets.max(nums)
}

fn looks_truncated(cleaned: &str) -> bool {
    let t = cleaned.trim_end();

    if t.is_empty() {
        return true;
    }

    let bad_endings = ["...", "…", "```", "**", "__", "- ", "* ", "1.", "2.", "3."];
    if bad_endings.iter().any(|x| t.ends_with(x)) {
        return true;
    }

    if t.ends_with('(') || t.ends_with(':') || t.ends_with(',') {
        return true;
    }

    let lines: Vec<&str> = t.lines().collect();
    if lines.len() >= 10 {
        if let Some(last) = lines.last() {
            if last.trim().len() <= 3 {
                return true;
            }
        }
    }

    false
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_scoring() {
        let input = r#"
BEST OPTION:
Choose Option A for maximum ROI.

RATIONALE:
- Cost effective
- Proven technology
- Team expertise

TOP RISKS:
- Market volatility
- Technical debt
- Resource constraints

ASSUMPTIONS TO VALIDATE:
- Budget approved
- Team available
- Timeline feasible

HALF-LIFE:
6 months - review quarterly

BLIND SPOTS:
- Competitor moves
- Regulatory changes

NEXT ACTIONS:
1. Get budget approval by Friday
2. Schedule kickoff meeting
3. Assign project lead
4. Create project charter
5. Set up tracking
6. Send stakeholder update
"#;

        let result = score_report_text(input, ScoringConfig::default());
        assert!(result.score >= 80);
        assert!(!result.must_repair);
        assert_eq!(result.missing_headers.len(), 0);
    }

    #[test]
    fn test_monte_carlo() {
        let risks = vec![
            RiskFactor {
                name: "Market Risk".to_string(),
                probability: 0.3,
                impact_low: 5.0,
                impact_high: 15.0,
                category: RiskCategory::Market,
            },
            RiskFactor {
                name: "Technical Risk".to_string(),
                probability: 0.2,
                impact_low: 10.0,
                impact_high: 25.0,
                category: RiskCategory::Technical,
            },
        ];

        let result = run_monte_carlo_simulation(
            85.0,
            &risks,
            MonteCarloConfig {
                iterations: 1000,
                seed: Some(42),
                confidence_level: 0.95,
            },
        );

        assert!(result.mean_score > 70.0 && result.mean_score < 90.0);
        assert!(result.std_dev > 0.0);
        assert_eq!(result.iterations_run, 1000);
    }

    #[test]
    fn test_sensitivity_analysis() {
        let config = SensitivityConfig {
            variables: vec![
                SensitivityVariable {
                    name: "Budget".to_string(),
                    base_value: 100000.0,
                    min_value: 50000.0,
                    max_value: 150000.0,
                    weight: 0.8,
                },
                SensitivityVariable {
                    name: "Timeline".to_string(),
                    base_value: 90.0,
                    min_value: 60.0,
                    max_value: 120.0,
                    weight: 0.5,
                },
            ],
            step_count: 10,
        };

        let result = run_sensitivity_analysis(80.0, config);
        
        assert_eq!(result.variable_impacts.len(), 2);
        assert_eq!(result.tornado_chart_data.len(), 2);
    }

    #[test]
    fn test_decision_decay() {
        let config = DecisionDecayConfig {
            initial_confidence: 90.0,
            decay_factors: vec![
                DecayFactor {
                    name: "Market Changes".to_string(),
                    decay_rate: 0.5,
                    volatility: 0.2,
                },
            ],
            time_horizon_days: 365,
        };

        let result = calculate_decision_decay(config);
        
        assert!(result.half_life_days > 0.0);
        assert!(!result.confidence_timeline.is_empty());
        assert!(result.stability_score >= 0.0 && result.stability_score <= 100.0);
    }
}
