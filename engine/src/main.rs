use serde::{Deserialize, Serialize};
use std::{env, fs};

#[derive(Debug, Deserialize)]
struct DecisionInput {
  title: String,
  context: String,
  intent: String,
  options: Vec<String>,
  assumptions: Vec<String>,
  risks: Vec<String>,
  evidence: Vec<String>,
  confidence: String,
  createdAtISO: String,
  outcome: Option<String>,
}

#[derive(Debug, Serialize)]
struct Analysis {
  readiness_score: u32,
  note: String,
}

fn main() {
  let args: Vec<String> = env::args().collect();
  if args.len() < 2 {
    eprintln!("Usage: grounds-engine <input.json>");
    std::process::exit(1);
  }
  let raw = fs::read_to_string(&args[1]).expect("read file");
  let input: DecisionInput = serde_json::from_str(&raw).expect("parse json");

  // Placeholder deterministic analysis (the Next.js app contains the full v0.1 heuristics).
  let score = 70u32;
  let analysis = Analysis {
    readiness_score: score,
    note: format!("Engine placeholder analysis for: {}", input.title),
  };

  println!("{}", serde_json::to_string_pretty(&analysis).unwrap());
}
