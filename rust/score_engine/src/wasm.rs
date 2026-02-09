use super::{score_report_text, ScoringConfig};
use console_error_panic_hook;
use serde_wasm_bindgen;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn init() {
    // Better panics in JS console
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn score_report(input: String) -> JsValue {
    let cfg = ScoringConfig::default();
    let result = score_report_text(&input, cfg);

    serde_wasm_bindgen::to_value(&result).unwrap_or_else(|_| JsValue::NULL)
}
