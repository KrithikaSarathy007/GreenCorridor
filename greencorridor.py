import matplotlib.pyplot as plt
from google import genai


# --------------------------------------------------
# STEP 1: Simulated City with Traffic Signals
# --------------------------------------------------
signals = [
    {"id": 1, "distance": 0, "state": "RED"},
    {"id": 2, "distance": 300, "state": "RED"},
    {"id": 3, "distance": 600, "state": "RED"},
    {"id": 4, "distance": 900, "state": "RED"},
]

# --------------------------------------------------
# STEP 2: Ambulance Movement Simulation
# --------------------------------------------------

ambulance = {
    "position": 0,    # meters
    "speed": 15       # meters per second
}

time_step = 1
total_distance = signals[-1]["distance"]
# --------------------------------------------------
# GEMINI AI: Emergency Priority Classification
# --------------------------------------------------

priority = "HIGH"  # default fallback

try:
    from google import genai

    client = genai.Client(api_key="PASTE_NEW_API_KEY_HERE")

    emergency_description = "Cardiac arrest patient needs immediate transfer"

    prompt = f"""
    Classify the emergency priority as HIGH, MEDIUM, or LOW.

    Emergency description:
    {emergency_description}

    Respond with only one word: HIGH, MEDIUM, or LOW.
    """

    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=prompt
    )

    priority = response.text.strip().upper()
    print(f"\nGemini AI Emergency Priority: {priority}")

except Exception as e:
    print("\n⚠️ Gemini unavailable, using default HIGH priority")

# --------------------------------------------------
# STEP 3: Green Corridor Logic
# --------------------------------------------------

if priority == "HIGH":
    GREEN_RANGE = 150
elif priority == "MEDIUM":
    GREEN_RANGE = 100
else:
    GREEN_RANGE = 70
  # meters before signal
simulation_time = 0

print("\nGreen Corridor Simulation Started\n")

while ambulance["position"] < total_distance:
    ambulance["position"] += ambulance["speed"] * time_step
    simulation_time += time_step

    print(f"Time: {simulation_time}s | Ambulance Position: {ambulance['position']} m")

    for signal in signals:
        distance_to_signal = signal["distance"] - ambulance["position"]

        if 0 < distance_to_signal <= GREEN_RANGE:
            signal["state"] = "GREEN"
        else:
            signal["state"] = "RED"

        print(
            f"  Signal {signal['id']} | "
            f"Distance: {distance_to_signal} m | "
            f"State: {signal['state']}"
        )

    print("-" * 50)

# --------------------------------------------------
# STEP 4: Performance Comparison
# --------------------------------------------------

num_signals = len(signals)
delay_per_signal = 10  # seconds

normal_time = (total_distance / ambulance["speed"]) + (num_signals * delay_per_signal)
green_corridor_time = simulation_time

print("\n--- PERFORMANCE RESULTS ---")
print(f"Normal Traffic Time: {normal_time:.2f} seconds")
print(f"Green Corridor Time: {green_corridor_time:.2f} seconds")

# Plotting the comparison graph
plt.bar(
    ["Normal Traffic", "Green Corridor"],
    [normal_time, green_corridor_time]
)
plt.ylabel("Time (seconds)")
plt.title("Ambulance Travel Time Comparison")
plt.show()