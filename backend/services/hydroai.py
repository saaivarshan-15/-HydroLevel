def row_insight(r):
    alerts=', '.join(r['post_alerts']) if r['post_alerts'] else 'none'
    if r['post_status']=='SAFE':
        return (f"Post-equalization screening is within the configured ±10 kg project threshold. "
                f"Highest raw position is {r['max_position']} at {r['raw'][r['max_position']]:.2f} kg. "
                f"Rear distribution is {r['rear_pct']:.1f}% and left/right distribution is {r['left_pct']:.1f}% / {r['right_pct']:.1f}%.")
    return (f"Post-equalization screening still flags {alerts}. "
            f"The highest raw position is {r['max_position']} at {r['raw'][r['max_position']]:.2f} kg. "
            f"Review load placement and vehicle-specific limits; HydroLevel screening does not replace certified inspection.")

def overall_insight(summary):
    if not summary or not summary.get('rows'):
        return 'No validated dataset available.'
    review = summary.get('insurance_review') or {}
    health = summary.get('health') or {}
    return (f"HydroLevel processed {summary['rows']} valid rows. Mean total measured load is "
            f"{summary['total_load_mean']:.2f} kg. {summary['pre_abnormal_rows']} rows were flagged before "
            f"equalization and {summary['post_abnormal_rows']} remained flagged after the configured "
            f"{summary['equalization_blend']*100:.0f}% equalization blend. Front/rear mean distribution is "
            f"{summary['front_pct_mean']:.1f}% / {summary['rear_pct_mean']:.1f}%, while left/right is "
            f"{summary['left_pct_mean']:.1f}% / {summary['right_pct_mean']:.1f}%. "
            f"HydroAI health screening: {health.get('risk_level','SAFE')} risk, score "
            f"{health.get('risk_score',0):.1f}/100. {health.get('recommendation','Continue monitoring.')} "
            f"Insurance review support status: {review.get('status','WAITING')}; engineering screening: "
            f"{review.get('engineering_screening','NOT AVAILABLE')}. These are project screening outputs, "
            f"not an insurance payout decision.")

def answer(question,r):
    q=question.lower()
    if 'overload' in q or 'which wheel' in q:
        return f"Highest raw load: {r['max_position']} at {r['raw'][r['max_position']]:.2f} kg. Post-equalization flagged positions: {', '.join(r['post_alerts']) if r['post_alerts'] else 'none'}."
    if 'balance' in q: return f"Front/rear = {r['front_pct']:.2f}% / {r['rear_pct']:.2f}%. Left/right = {r['left_pct']:.2f}% / {r['right_pct']:.2f}%."
    if 'equal' in q: return f"Equalized values: FL {r['equalized']['FL']:.2f}, FR {r['equalized']['FR']:.2f}, RL {r['equalized']['RL']:.2f}, RR {r['equalized']['RR']:.2f} kg using a {r['equalization_blend_percent']:.0f}% blend toward the arithmetic reference."
    if 'health' in q or 'risk' in q:
        return (f"Current row health status: {r.get('health_risk_level','SAFE')} risk, "
                f"screening score {r.get('health_risk_score',0):.1f}/100. "
                f"Flags: {', '.join(r.get('health_flags',[]))}. "
                f"Recommendation: {r.get('health_recommendation','Continue monitoring.')}")
    if 'why' in q or 'status' in q: return row_insight(r)
    return f"Row {r['index']}: total {r['total']:.2f} kg, reference {r['average']:.2f} kg, pre {r['pre_status']}, post {r['post_status']}."
