var my_alive_spirits = my_spirits.filter((s) => s.hp > 0);
console.log(`my_alive_spirits: ${my_alive_spirits.length}`);

function dist_sq(coor1, coor2) {
    let a = coor1[0] - coor2[0];
    let b = coor1[1] - coor2[1];
    return a * a + b * b;
}

function bridge_harvesters_req(coor1, coor2) {
    let dist = Math.sqrt(dist_sq(coor1, coor2));
    let energize_max_dist = 200;
    let harvest_units_req = Math.ceil(dist / energize_max_dist) - 1;
    return harvest_units_req;
}

function energy_bridge_positions(coor1, coor2, harvest_units_req) {
    // Part 2: postiion bots 200units away from each other locaitons
    let bridge_positions = new Array();
    let m1 = 1;
    let m2 = harvest_units_req;
    for (let i = 0; i < harvest_units_req; ++i) {
        let x_pos = Math.ceil((m1 * coor2[0] + m2 * coor1[0]) / (m1 + m2));
        let y_pos = Math.ceil((m1 * coor2[1] + m2 * coor1[1]) / (m1 + m2));
        bridge_positions.push([x_pos, y_pos]);
        m1++;
        m2--;
    }
    return bridge_positions;
}

function bridge_move(base, star, bridge_spirits) {
    let harvest_units_req = bridge_spirits.length;
    bridge_positions = energy_bridge_positions(
        base.position,
        star.position,
        harvest_units_req
    );
    for (let i = 0; i < harvest_units_req; i++) {
        bridge_spirits[i].move(bridge_positions[i]);
    }
}

function bridge_harvesting(base, bridge_spirits) {
    let num_harvesters = bridge_spirits.length;
    for (let i = num_harvesters - 1; i >= 0; --i) {
        if (i == num_harvesters - 1) {
            if (
                bridge_spirits[i].energy <
                bridge_spirits[i].energy_capacity * 0.3
            ) {
                bridge_spirits[i].energize(bridge_spirits[i]);
            } else {
                bridge_spirits[i].energize(bridge_spirits[i - 1]);
            }
        } else if (i == 0) {
            bridge_spirits[i].energize(base);
        } else {
            bridge_spirits[i].energize(bridge_spirits[i - 1]);
        }
    }
}

// Marking whether my base is at the top starting position or bottom
var my_base = base_zxq;
var enemy_base = base_a2c;
var my_star = star_zxq;
var enemy_star = star_a2c;

if (base_a2c.control == this_player_id) {
    enemy_base = base_zxq;
}

if (
    dist_sq(star_a2c.position, my_base.position) <
    dist_sq(star_zxq.position, my_base.position)
) {
    my_star = star_a2c;
    enemy_star = star_zxq;
}

// all spirit that are havrvesters
var harvest_spirits = my_alive_spirits.filter((s) => (s.mark = "harvest"));
console.log("hs: " + harvest_spirits.length);
// contain all the spirits that are in bridges
var bridges;
if (memory.bridges) {
    bridges = memory.bridges;
} else {
    bridges = new Array();
}

function initial_bridge(base, star) {}

if (tick < 100) {
    // run initial setting up of first bridge
    console.log("here");
    let harvesters_req = bridge_harvesters_req(
        my_base.position,
        my_star.position
    );
    console.log("harvesters_req: " + harvesters_req);
    let bridge_spirits = new Array();
    for (let i = 0; i < harvesters_req; ++i) {
        my_alive_spirits[i].mark = "harvest";
        bridge_spirits.push(my_alive_spirits[i]);
    }
    bridge_move(my_base, my_star, bridge_spirits);
    bridges.push(bridge_spirits);
} else {
    console.log("else loop");
}

for (let spirit of my_alive_spirits) {
    if (spirit.mark != "harvest") {
        spirit.mark = "fight";
        spirit.move(my_base.position);
    }
}

for (let bridge of bridges) {
    bridge_harvesting(my_base, bridge);
}

memory.bridges = bridges;

// Loop through all my spirits and making a state machine — if the
// spirit is empty, go harvest energy. If full, give it to the base
/*
for (let spirit of my_spirits) {
  if (spirit.energy == spirit.energy_capacity) spirit.set_mark("charging");
  if (spirit.energy == 0) spirit.set_mark("harvesting");

  if (spirit.mark == "charging") {
    spirit.move(my_base.position);
    spirit.energize(my_base);
  }
  if (spirit.mark == "harvesting") {
    spirit.move(my_star.position);
    spirit.energize(spirit);
  }

  // Rather bad code to deal with attackers. Improve it!
  if (my_base.sight.enemies.length > 0) {
    //spirit objects are accessed by spirits['id']
    let enemy = spirits[my_base.sight.enemies[0]];
    spirit.move(enemy.position);
    spirit.energize(enemy);
  }

  // the last action (move, energize, ...) will overwrite any previous ones
  // in the same tick
} */