import matplotlib.pyplot as plt
import matplotlib.animation as animation

# -------------------------------
# City Configuration
# -------------------------------
GREEN_RANGE = 100  # meters
signal_positions = [0, 300, 600, 900]
road_length = 1000



ambulance_speed = 15   # meters per frame
time_step = 1

# -------------------------------
# Plot Setup
# -------------------------------
fig, ax = plt.subplots(figsize=(10, 3))
ax.set_xlim(-50, road_length)
ax.set_ylim(-1, 1)
ax.axis("off")
ax.set_title("Virtual City - Ambulance Movement")

# Draw road
ax.plot([0, road_length], [0, 0], linewidth=6, zorder=1)

# Draw traffic signals
signal_dots = []
for i, pos in enumerate(signal_positions):
    dot = ax.scatter(pos, 0, s=400, color="red", zorder=2)
    signal_dots.append(dot)
    ax.text(pos, 0.15, f"S{i+1}", ha="center", fontsize=12)

# -------------------------------
# Ambulance (IMPORTANT FIX)
# -------------------------------
ambulance_y = 0.25   # lift above road
ambulance_position = 0

ambulance_dot, = ax.plot(
    ambulance_position,
    ambulance_y,
    marker="s",
    markersize=18,
    color="blue",
    zorder=5
)

# -------------------------------
# Init Function (REQUIRED)
# -------------------------------
def init():
    ambulance_dot.set_data([ambulance_position], [ambulance_y])
    return ambulance_dot,

# -------------------------------
# Animation Update
# -------------------------------
def update(frame):
    global ambulance_position
    ambulance_position += ambulance_speed

    # Move ambulance
    ambulance_dot.set_data([ambulance_position], [ambulance_y])

    # Update signal colors
    for i, pos in enumerate(signal_positions):
        distance = pos - ambulance_position

        if 0 < distance <= GREEN_RANGE:
            signal_dots[i].set_color("green")

        else:
            signal_dots[i].set_color("red")

    return ambulance_dot, *signal_dots


# -------------------------------
# Animation
# -------------------------------
ani = animation.FuncAnimation(
    fig,
    update,
    init_func=init,
    frames=60,
    interval=200,
    blit=False
)

plt.show()
