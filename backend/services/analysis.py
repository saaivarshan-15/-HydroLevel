from typing import Dict
import math

POSITIONS = ('FL', 'FR', 'RL', 'RR')


def _status(deviations, threshold):
    maximum = max((abs(v) for v in deviations.values()), default=0)
    if maximum <= threshold:
        return 'SAFE'
    if maximum <= threshold * 2:
        return 'WARNING'
    return 'DANGER'


def _cg(values):
    """Normalized CG position: x=right/left balance, y=front/rear balance."""
    total = sum(values.values())
    if not total:
        return 0.0, 0.0
    front = values['FL'] + values['FR']
    rear = values['RL'] + values['RR']
    left = values['FL'] + values['RL']
    right = values['FR'] + values['RR']
    return (right - left) / total, (front - rear) / total


def analyze_row(values, index, threshold=10.0, blend=.5):
    raw = {p: float(values[p]) for p in POSITIONS}
    total = sum(raw.values())
    avg = total / 4 if total else 0.0
    dev = {p: raw[p] - avg for p in POSITIONS}
    eq = {p: raw[p] + blend * (avg - raw[p]) for p in POSITIONS}
    eqdev = {p: eq[p] - avg for p in POSITIONS}

    front = raw['FL'] + raw['FR']
    rear = raw['RL'] + raw['RR']
    left = raw['FL'] + raw['RL']
    right = raw['FR'] + raw['RR']
    pre = [p for p in POSITIONS if abs(dev[p]) > threshold]
    post = [p for p in POSITIONS if abs(eqdev[p]) > threshold]

    cg_x, cg_y = _cg(eq)
    raw_cg_x, raw_cg_y = _cg(raw)

    return {
        'index': index,
        'raw': raw,
        'total': total,
        'average': avg,
        'reference': avg,
        'deviations': dev,
        'equalized': eq,
        'equalized_deviations': eqdev,
        'front_axle': front,
        'rear_axle': rear,
        'left_side': left,
        'right_side': right,
        'front_pct': front / total * 100 if total else 0,
        'rear_pct': rear / total * 100 if total else 0,
        'left_pct': left / total * 100 if total else 0,
        'right_pct': right / total * 100 if total else 0,
        'max_position': max(POSITIONS, key=raw.get),
        'min_position': min(POSITIONS, key=raw.get),
        'pre_status': _status(dev, threshold),
        'post_status': _status(eqdev, threshold),
        'pre_alerts': pre,
        'post_alerts': post,
        'cg_x': cg_x,
        'cg_y': cg_y,
        'raw_cg_x': raw_cg_x,
        'raw_cg_y': raw_cg_y,
        'equalization_blend_percent': blend * 100,
    }


def validate_rows(rows):
    valid = []
    errors = []
    for i, row in enumerate(rows, 1):
        missing = [p for p in POSITIONS if p not in row or row[p] in ('', None)]
        if missing:
            errors.append(f'Row {i}: missing {", ".join(missing)}')
            continue
        try:
            vals = {p: float(row[p]) for p in POSITIONS}
            if any(not math.isfinite(v) for v in vals.values()):
                raise ValueError('non-finite number')
            if any(v < 0 for v in vals.values()):
                raise ValueError('negative wheel load')
            if any(v >= 1e7 for v in vals.values()):
                raise ValueError('unrealistic numeric magnitude')
            valid.append(vals)
        except Exception as exc:
            errors.append(f'Row {i}: FL/FR/RL/RR must be valid non-negative numbers ({exc})')
    return valid, errors



def _linear_slope(values):
    """Simple least-squares slope per row; used for transparent trend scoring."""
    n = len(values)
    if n < 2:
        return 0.0
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    denom = sum((i - x_mean) ** 2 for i in range(n))
    if not denom:
        return 0.0
    return sum((i - x_mean) * (y - y_mean) for i, y in enumerate(values)) / denom


def _longest_true_run(flags):
    longest = current = 0
    for flag in flags:
        current = current + 1 if flag else 0
        longest = max(longest, current)
    return longest


def _health_history(results, threshold):
    """Build a transparent, rule-based vehicle-health screening from history.

    This is not a trained ML model. It uses repeated alerts, persistence and
    load/deviation trends to produce an explainable early-risk indicator.
    """
    if not results:
        return {
            'risk_score': 0,
            'risk_level': 'SAFE',
            'indicators': [],
            'recommendation': 'No validated history available.',
            'predictive_insight': 'Insufficient historical data for an early-risk assessment.',
            'history_rows': 0,
            'trend': {'total_load_slope_kg_per_row': 0.0, 'max_deviation_slope_kg_per_row': 0.0},
            'wheel_alert_counts': {p: 0 for p in POSITIONS},
            'persistent_wheel_alerts': {p: 0 for p in POSITIONS},
        }

    post_alert_counts = {
        p: sum(p in r['post_alerts'] for r in results) for p in POSITIONS
    }
    persistent = {
        p: _longest_true_run([p in r['post_alerts'] for r in results])
        for p in POSITIONS
    }
    total_series = [r['total'] for r in results]
    dev_series = [max(abs(v) for v in r['deviations'].values()) for r in results]
    total_slope = _linear_slope(total_series)
    dev_slope = _linear_slope(dev_series)
    rows = len(results)
    alert_rate = sum(bool(r['post_alerts']) for r in results) / rows * 100
    max_persistent = max(persistent.values(), default=0)
    repeated_wheels = sum(v >= max(3, math.ceil(rows * .05)) for v in post_alert_counts.values())

    # Explainable 0–100 score. The score is a screening indicator, not a
    # mechanical failure probability.
    score = 0.0
    score += min(40.0, alert_rate * 0.8)
    score += min(25.0, max_persistent * 5.0)
    score += min(20.0, repeated_wheels * 6.0)
    if dev_slope > max(threshold * 0.02, 0.01):
        score += min(15.0, dev_slope / max(threshold, 1.0) * 15.0)
    score = round(min(100.0, score), 1)

    if score >= 60:
        level = 'DANGER'
    elif score >= 25:
        level = 'WARNING'
    else:
        level = 'SAFE'

    indicators = []
    if alert_rate > 0:
        indicators.append(f'Repeated overload/imbalance in {alert_rate:.1f}% of analysed rows')
    for p in POSITIONS:
        if post_alert_counts[p]:
            indicators.append(f'{p} flagged in {post_alert_counts[p]} rows')
    if max_persistent >= 3:
        indicators.append(f'Persistent abnormal loading up to {max_persistent} consecutive rows')
    if dev_slope > max(threshold * 0.02, 0.01):
        indicators.append('Maximum load deviation shows an increasing historical trend')
    if not indicators:
        indicators.append('No persistent abnormal load pattern detected')

    if level == 'DANGER':
        recommendation = 'Prioritize vehicle inspection and load-placement review before continued operation.'
    elif level == 'WARNING':
        recommendation = 'Review repeated wheel-level deviations and monitor the next operating cycles closely.'
    else:
        recommendation = 'Continue monitoring; no persistent abnormal load pattern is currently indicated.'

    trend_direction = (
        'increasing' if dev_slope > max(threshold * 0.02, 0.01)
        else 'stable/decreasing'
    )
    predictive = (
        f'Historical screening indicates a {level} vehicle-health risk level '
        f'(score {score}/100). Load-deviation behaviour is {trend_direction}; '
        f'{alert_rate:.1f}% of analysed rows contained a post-equalization alert. '
        f'This rule-based early warning supports preventive inspection and is not a failure probability.'
    )

    return {
        'risk_score': score,
        'risk_level': level,
        'indicators': indicators,
        'recommendation': recommendation,
        'predictive_insight': predictive,
        'history_rows': rows,
        'alert_rate_percent': round(alert_rate, 2),
        'trend': {
            'total_load_slope_kg_per_row': round(total_slope, 4),
            'max_deviation_slope_kg_per_row': round(dev_slope, 4),
            'deviation_direction': trend_direction,
        },
        'wheel_alert_counts': post_alert_counts,
        'persistent_wheel_alerts': persistent,
    }

def analyze_dataset(rows, threshold=10.0, blend=.5):
    results = [analyze_row(r, i + 1, threshold, blend) for i, r in enumerate(rows)]
    if not results:
        return {
            'count': 0,
            'results': [],
            'summary': {
                'rows': 0,
                'min_rows_required': 20,
                'report_allowed': False,
                'threshold_kg': threshold,
                'equalization_blend': blend,
            },
        }

    health = _health_history(results, threshold)
    # Attach a row-level, explainable health signal for the Digital Twin and UI.
    for r in results:
        row_flags = []
        if r['post_alerts']:
            row_flags.extend([f'{p} overload/imbalance' for p in r['post_alerts']])
        if not row_flags:
            row_flags.append('No wheel-level anomaly')
        r['health_flags'] = row_flags
        r['health_risk_level'] = 'DANGER' if r['post_status'] == 'DANGER' else ('WARNING' if r['post_status'] == 'WARNING' else 'SAFE')
        r['health_risk_score'] = round(min(100.0, max(0.0, max(abs(v) for v in r['deviations'].values()) / max(threshold, 1.0) * 25.0)), 1)
        r['health_recommendation'] = ('Inspect load placement and vehicle-specific limits.' if r['post_alerts'] else 'Continue monitoring.')

    totals = [r['total'] for r in results]
    wheel = [r['raw'][p] for r in results for p in POSITIONS]
    pre_abnormal = sum(r['pre_status'] != 'SAFE' for r in results)
    post_abnormal = sum(r['post_status'] != 'SAFE' for r in results)
    post_danger = sum(r['post_status'] == 'DANGER' for r in results)
    post_warning = sum(r['post_status'] == 'WARNING' for r in results)
    max_abs_dev = max((max(abs(v) for v in r['deviations'].values()) for r in results), default=0.0)
    post_abnormal_rate = post_abnormal / len(results) * 100

    sm = {
        'rows': len(results),
        'min_rows_required': 20,
        'report_allowed': len(results) >= 20,
        'threshold_kg': threshold,
        'equalization_blend': blend,
        'total_load_mean': sum(totals) / len(totals),
        'total_load_min': min(totals),
        'total_load_max': max(totals),
        'wheel_load_mean': sum(wheel) / len(wheel),
        'max_wheel_load': max(wheel),
        'min_wheel_load': min(wheel),
        'pre_abnormal_rows': pre_abnormal,
        'post_abnormal_rows': post_abnormal,
        'post_warning_rows': post_warning,
        'post_danger_rows': post_danger,
        'post_abnormal_rate_percent': post_abnormal_rate,
        'max_absolute_deviation_kg': max_abs_dev,
        'health': health,
        'health_risk_score': health['risk_score'],
        'health_risk_level': health['risk_level'],
        'front_pct_mean': sum(r['front_pct'] for r in results) / len(results),
        'rear_pct_mean': sum(r['rear_pct'] for r in results) / len(results),
        'left_pct_mean': sum(r['left_pct'] for r in results) / len(results),
        'right_pct_mean': sum(r['right_pct'] for r in results) / len(results),
        # This is deliberately a review-support flag, not an underwriting or payout decision.
        'insurance_review': {
            'status': (
                'PASS — ENGINEERING SCREENING' if post_abnormal == 0 else
                'REVIEW — LOAD ANOMALY DETECTED' if post_danger == 0 else
                'ALERT — SIGNIFICANT LOAD ANOMALY DETECTED'
            ) if len(results) >= 20 else 'INSUFFICIENT DATA',
            'engineering_screening': (
                'PASS — NO SIGNIFICANT LOAD ANOMALY DETECTED' if post_abnormal == 0 else
                'REVIEW — LOAD ANOMALY DETECTED' if post_danger == 0 else
                'ALERT — SIGNIFICANT LOAD ANOMALY DETECTED'
            ),
            'post_alert_rate_percent': post_abnormal_rate,
            'payout_decision': ('ENGINEERING SCREENING PASSED — NO LOAD-BASED OBJECTION' if post_abnormal == 0 else 'ENGINEERING SCREENING FLAGGED — CLAIM REVIEW REQUIRED'),
            'manual_review_required': True,
            'note': "HydroLevel provides engineering screening evidence for insurance claim assessment. A SAFE result means no configured load anomaly was detected in the analyzed measurements; it does not by itself establish coverage, claim validity or a monetary payout. Those decisions remain with the authorized insurer using policy terms and claim evidence."
        },
    }
    return {'count': len(results), 'results': results, 'summary': sm}
