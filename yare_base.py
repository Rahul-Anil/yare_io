# The following code should help you start things off. Learn more
# in the Documentation

# ---------- ---------- ---------- ---------- ----------
# ---------- ---------- ---------- ---------- ----------


# Simple function for comparing distances
def dist_sq(coor1, coor2):
    a = coor1[0] - coor2[0]
    b = coor1[1] - coor2[1]
    return a * a + b * b


# Marking whether my base is at the top starting position or bottom
my_base = base_zxq
enemy_base = base_a2c
my_star = star_zxq
enemy_star = star_a2c

if base_a2c.control == this_player_id:
    my_base = base_a2c
    enemy_base = base_zxq

if dist_sq(star_a2c.position, my_base.position) < dist_sq(
    star_zxq.position, my_base.position
):
    my_star = star_a2c
    enemy_star = star_zxq

# Loop through all my spirits and making a state machine — if the
# spirit is empty, go harvest energy. If full, give it to the base
for spirit in my_spirits:
    if spirit.energy == spirit.energy_capacity:
        spirit.set_mark("charging")
    if spirit.energy == 0:
        spirit.set_mark("harvesting")

    if spirit.mark == "charging":
        spirit.move(my_base.position)
        spirit.energize(my_base)

    if spirit.mark == "harvesting":
        spirit.move(my_star.position)
        spirit.energize(spirit)
    
    # Rather bad code to deal with attackers. Improve it!
    if my_base.sight.enemies.length > 0:
        # spirit objects are accessed by spirits['id']
        enemy_id = my_base.sight.enemies[0]
        enemy = spirits[enemy_id]
        spirit.move(enemy.position)
        spirit.energize(enemy)
