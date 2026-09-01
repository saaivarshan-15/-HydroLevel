# HydroLevel
## AI-Powered Public Transport Vehicle Breakdown Prediction & Load Intelligence Platform

**Team Volts and Bolts** | **Omnikon National Hackathon 2026**  
**Version:** V7.0 — Vehicle Health Intelligence + Sensor-Ready Telemetry

> **"Don't just detect vehicle overload. Predict the conditions that may lead to vehicle failure."**

---

# 🚀 One-Line Pitch

HydroLevel is an intelligent vehicle-health platform designed to support **public transport vehicle breakdown prediction** by analysing four-wheel load distribution, detecting persistent abnormal loading, tracking centre-of-gravity movement, identifying vehicle-health risk patterns, and generating explainable engineering reports.

---

# 🔗 Project Links

## 🌐 Live Deployment

**[Launch HydroLevel](YOUR_RENDER_URL)**

## 💻 GitHub Repository

**[View Source Code](https://github.com/saaivarshan-15/-HydroLevel)**

## 🎥 Demonstration Video

**[Watch Project Demo](https://drive.google.com/file/d/1TIMJykE_KHIFoFODNDaPn4i5jS6boXvD/view?usp=sharing)**

---

# 1. Problem Statement

## Predicting Public Transport Vehicle Breakdowns

Public transport vehicles such as buses operate for long hours under continuously changing passenger and cargo loads.

A vehicle may experience:

- Uneven passenger distribution
- Repeated wheel overloading
- Excessive load on one side
- Persistent load imbalance
- Centre-of-gravity shifts
- Abnormal load patterns over time

These conditions can contribute to increased stress on vehicle components and may become early indicators of potential vehicle-health problems.

Traditional vehicle monitoring systems often focus on individual measurements such as total vehicle weight or basic fault detection.

However, **total vehicle weight alone cannot explain how the load is distributed across the vehicle or whether abnormal patterns are repeatedly occurring.**

For example, two buses can have the same total weight while having completely different load distributions across their four wheel positions.

Therefore, there is a need for an intelligent system that can analyse vehicle-load behaviour over time and identify **early warning patterns associated with potential vehicle breakdown risk.**

---

# 2. Proposed Solution

HydroLevel addresses the problem of **public transport vehicle breakdown prediction** through continuous vehicle-load intelligence and historical health screening.

The platform analyses load information from four wheel positions:

- Front Left (FL)
- Front Right (FR)
- Rear Left (RL)
- Rear Right (RR)

The system converts raw vehicle-load data into engineering information such as:

- Total vehicle load
- Individual wheel loads
- Average wheel load
- Load deviation
- Equalized reference load
- Wheel-level abnormal-load detection
- Centre-of-gravity movement
- Historical load behaviour
- Persistent overload detection
- Vehicle-health risk screening
- Explainable HydroAI insights
- Engineering reports

The current prototype supports **CSV, XLSX and XLS data playback**, together with a **sensor-ready JSON telemetry interface** designed for future ESP32/HX711 load-cell integration.

---

# 3. How HydroLevel Helps Predict Breakdowns

HydroLevel follows a multi-stage approach.

Instead of attempting to predict a breakdown from a single load measurement, the platform looks for **repeated and persistent abnormal patterns** in historical vehicle data.

The system considers factors such as:

1. Repeated wheel overload
2. Persistent load imbalance
3. Wheel-to-wheel deviation
4. Load distribution trends
5. Centre-of-gravity movement
6. Historical abnormal events

These factors are combined into an **explainable 0–100 vehicle-health early-risk indicator**.

The objective is to provide an early warning that allows fleet operators and maintenance teams to investigate a vehicle before a serious failure occurs.

> **Important:** The current V7.0 prototype uses a transparent rule-based early-warning engine. It is not claiming to be a trained machine-learning failure-probability model.

This makes the current system explainable and provides a foundation for future machine-learning-based predictive maintenance.

---

# 4. System Workflow

```text
              PUBLIC TRANSPORT VEHICLE
                       │
                       ▼
             Vehicle Load Information
                       │
                       ▼
          CSV / Excel / JSON Telemetry
                       │
                       ▼
             Data Validation
                       │
                       ▼
             Four-Wheel Analysis
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       FL/FR/RL/RR   Deviation   Total Load
          │            │            │
          └────────────┼────────────┘
                       ▼
             Abnormal Load Detection
                       │
                       ▼
             Centre-of-Gravity Analysis
                       │
                       ▼
              Historical Trend Analysis
                       │
                       ▼
           Persistent Abnormal Patterns
                       │
                       ▼
          Vehicle Health Risk Screening
                       │
                       ▼
                  HydroAI
                       │
                       ▼
          Explainable Early-Warning
                       │
                       ▼
            Engineering Reports
          PDF / Excel / CSV / JSON
                       │
                       ▼
        MAINTENANCE INVESTIGATION /
              EARLY INTERVENTION
