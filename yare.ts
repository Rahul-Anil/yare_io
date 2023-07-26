type pos = {
    x: number;
    y: number;
};

enum SpiritJob {
    harvest, // responsible for beam harvesting
    charge, // responsible for charging a target
    attack, // will move towards enemy base and attach
    defend, // will defend the base
    NoJob, // When a new spirit is spawned, it will have no job
}

enum HarvestingMethod {
    bridge,
    inefficient,
}

type OldSpiritInfo = {
    belongs_to_base?: Base;
    is_moving: boolean;
    job?: SpiritJob;
    moveTo?: pos;
    energizeSource?: Base | Spirit | Star;
    energizeTarget?: Base | Spirit | Star;
};

// Get the info of which base is mine, which is enemy's, and which is neutral
function get_all_base_info(): [Base[], Base[], Base[]] {
    let my_base_list = new Array();
    let enemy_base_list = new Array();
    let neutral_base_list = new Array();

    let base_list = [base_zxq, base_a2c, base_p89, base_nua];
    for (let base of base_list) {
        if (base.control == this_player_id) {
            my_base_list.push(base);
        } else if (base.control == "") {
            neutral_base_list.push(base);
        } else {
            enemy_base_list.push(base);
        }
    }

    return [my_base_list, enemy_base_list, neutral_base_list];
}

// Get all the spirits that are alive
function alive_spirits() {
    return my_spirits.filter((s) => s.hp > 0);
}

// Get dist b/w 2 points
function sq_dist(coord1, coord2) {
    return Math.pow(
        Math.pow(coord2[0] - coord1[0], 2) + Math.pow(coord2[0] - coord1[0], 2),
        0.5
    );
}

// helper function
function printMap<K, V>(map: Map<K, V>): void {
    console.log("Map contents:");
    map.forEach((value, key) => {
        console.log(`${key.toString()} => ${value.id.toString()}`);
    });
}

// Get the dist b/w all the stars and all the bases
function base_star_dict() {
    let base_star_dict = new Map();
    //List of all stars
    let all_stars = [star_zxq, star_a2c, star_p89, star_nua];
    let all_base = [base_zxq, base_a2c, base_p89, base_nua];

    for (let base of all_base) {
        // Map that will contain the starid => dist
        let star_map = new Map();
        for (let star of all_stars) {
            // find distance b/w the star and the bases
            let dist: number = sq_dist(base.position, star.position);
            star_map.set(star, dist);
        }
        base_star_dict.set(base.id, star_map);
    }
    return base_star_dict;
}

// Calculations that are made on first tick
function tick_zero_calc() {
    // calculate the distance of each star to each base
    let all_base_star_dict = base_star_dict();
    return all_base_star_dict;
}

// find the closest friendly base to a spirit
function find_closest_friendly_base(spirit: Spirit, my_base_list: Base[]) {
    let closest_base: Base | undefined = undefined;
    let closest_dist: number | undefined = undefined;
    for (let base of my_base_list) {
        let dist: number = sq_dist(spirit.position, base.position);
        if (!closest_base || !closest_dist) {
            closest_base = base;
            closest_dist = dist;
        } else if (dist < closest_dist) {
            closest_base = base;
            closest_dist = dist;
        }
    }
    return closest_base;
}

// Function to check if a variable is of type SpiritInfo (Custom type guard)
function isSpiritInfo(arg: any): arg is SpiritInfo {
    return (arg as SpiritInfo).belongs_to_base !== undefined;
}

// Set SpiritInfo for all spirits
function get_set_marks_for_spirits(
    my_alive_spirits: any,
    my_base_list: Base[]
) {
    for (let alive_spirit of my_alive_spirits) {
        // get the mark of the spirit from memory if it exists
        if (
            memory.spirit_info.size > 0 &&
            memory.spirit_info.get(alive_spirit.id)
        ) {
            let spirit_info: SpiritInfo = memory.spirit_info.get(
                alive_spirit.id
            );
            alive_spirit.mark = spirit_info;
        }

        // if mark is not set, then set it to a default value
        if (!isSpiritInfo(alive_spirit.mark)) {
            let belongs_to_base = find_closest_friendly_base(
                alive_spirit,
                my_base_list
            );
            let spirit_info: SpiritInfo = {
                belongs_to_base: belongs_to_base,
                is_moving: false,
                job: SpiritJob.NoJob,
                moveTo: undefined,
            };
            alive_spirit.mark = spirit_info;
        }
    }
}

// BRIDGE

// Function to find the positions of the bridge
function bridge_pos(coor1, coor2, no_of_spirits): pos[] {
    let bridge_positions: pos[] = [];
    let m1: number = 1;
    let m2: number = no_of_spirits;
    for (let i = 0; i < no_of_spirits; i++) {
        let x = Math.ceil((m1 * coor2[0] + m2 * coor1[0]) / (m1 + m2));
        let y = Math.ceil((m1 * coor2[1] + m2 * coor1[1]) / (m1 + m2));
        bridge_positions.push({ x: x, y: y });
        m1++;
        m2--;
    }
    return bridge_positions;
}

function inefficient_harvesting(spirits: Spirit[], base: Base, star: Star) {
    for (let spirit of spirits) {
        spirit.mark.job = SpiritJob.harvest;
        if (spirit.energy == spirit.energy_capacity) {
            spirit.mark.energizeTarget = base;
        }

        if (spirit.energy == 0) {
            spirit.mark.energizeTarget = spirit;
        }

        if (spirit.mark.energizeTarget == base) {
            spirit.move(base.position);
            spirit.energize(spirit.mark.energizeTarget);
        }

        if (spirit.mark.energizeTarget == spirit) {
            spirit.move(star.position);
            spirit.energize(spirit);
        }
    }
}

function harvester_spirits(spirits_assigned_to_base: Spirit[]) {
    let harvest_spirits = spirits_assigned_to_base.filter(
        (spirit) => spirit.mark.job == SpiritJob.harvest
    );
    for (let harvest_spirit of harvest_spirits) {
        // Move to target position if spirit is not already theres
        if (
            harvest_spirit.position[0] != harvest_spirit.mark.target.x &&
            harvest_spirit.position[1] != harvest_spirit.mark.target.y
        ) {
            harvest_spirit.move([
                harvest_spirit.mark.target.x,
                harvest_spirit.mark.target.y,
            ]);
        } else {
            // Spirit is already at target position
            // start harvesting loop
            if (harvest_spirit.energy < harvest_spirit.energy_capacity * 0.2) {
                if (harvest_spirit.mark.energizeSource !== undefined) {
                    harvest_spirit.energize(harvest_spirit.mark.energizeSource);
                }
            } else {
                harvest_spirit.energize(harvest_spirit.mark.energizeTarget);
            }
        }
    }
}

function get_star_list_in_terms_of_pref(
    dist_base_from_star: Map<Star, number>
) {
    let star_list_in_terms_of_pref = new Map();
    let dist_list = new Array();
    let curr_energy = new Array();
    let energy_capacity = new Array();
    let energy_regen = new Array();
    for (let [key, value] of dist_base_from_star) {
        dist_list.push(value);
        curr_energy.push(key.energy);
        energy_capacity.push(key.energy_capacity);
        energy_regen.push(key.regeneration);
    }

    for (let [key, value] of dist_base_from_star) {
        // Positive factors
        let curr_energy_std =
            key.energy /
            curr_energy.reduce((acc: number, inp: number) => acc + inp);
        let energy_capacity_std =
            key.energy_capacity /
            energy_capacity.reduce((acc: number, inp: number) => acc + inp);
        let energy_regen_std =
            key.regeneration /
            energy_regen.reduce((acc: number, inp: number) => acc + inp);

        // Negative factors
        let dist_std =
            value / dist_list.reduce((acc: number, inp: number) => acc + inp);

        let preference_value =
            curr_energy_std + energy_capacity_std + energy_regen_std - dist_std;

        star_list_in_terms_of_pref.set(key, preference_value);
    }

    // ssort
    star_list_in_terms_of_pref_sort = new Map(
        [...star_list_in_terms_of_pref].sort((a, b) => b[1] - a[1])
    );
    // give value
    let star_in_terms_of_perf = new Map();
    let i = 0;
    for (let [key, val] of star_list_in_terms_of_pref_sort) {
        star_in_terms_of_perf.set(i, key);
        i++;
    }
    printMap(star_in_terms_of_perf);
    return star_in_terms_of_perf;
}

// function main
function main() {
    // Get the info of all bases
    let [my_base_list, enemy_base_list, neutral_base_list] =
        get_all_base_info();
    // Set energize max dist
    let energize_max_dist = 20;

    if (tick == 1) {
        // These variables will need to be stored in memory
        const all_star_base_dict = tick_zero_calc();

        // Set the memory
        memory.all_star_base_dict = all_star_base_dict;
        // Set the spirit info in memory to a map
        memory.spirit_info = new Map();
    }

    // Get all spirits that are alive
    const my_alive_spirits = alive_spirits();

    // Set SpiritInfo for all spirits
    // For all alive spirit make sure that mark is set to SpiritInfo if not set
    get_set_marks_for_spirits(my_alive_spirits, my_base_list);

    for (let base of my_base_list) {
        let harvesting_method: HarvestingMethod = HarvestingMethod.bridge;

        // List of all friendly spirit near base
        let friends_near_base = base.sight.friends;
        // List of all enemy spirit near base
        let enemies_near_base = base.sight.enemies;
        // List of all structures near the base
        let structures_near_base = base.sight.structures;

        // filter out the spirits that are assigned to this base
        let spirits_assigned_to_base = my_alive_spirits.filter(
            (spirit) => spirit.mark.belongs_to_base.id == base.id
        );

        // dist of stars from the base
        let dist_stars_from_base = memory.all_star_base_dict.get(base.id);

        let stars_ordering_by_pref =
            get_star_list_in_terms_of_pref(dist_stars_from_base);

        // BASE HARVESTING UNIT

        // if base energy is less than 50% then find the closest star and assign the
        // number of spirits required to harvest the star

        // if the base energy is not 0 and the number of spirits assigned to the base is
        // more than 0 then check if any of the spirits that are in harvesting mode that
        // are assigned to the base have the last energized obj is the base
        if (base.energy < base.energy_capacity * 0.5) {
            // find the closest star to the base from all_star_base_dict
            let closest_star: Star = stars_ordering_by_pref.get(0);
            console.log("closest_star :" + closest_star.id);
            let dist_to_closest_star = sq_dist(
                closest_star.position,
                base.position
            );
            console.log("dist to closest_star: " + dist_to_closest_star);
            let no_of_harvesters_req = Math.ceil(
                dist_to_closest_star / energize_max_dist
            );
            console.log("No of harvesters req: " + no_of_harvesters_req);

            // check if we have the no of spirts required to harvest the star
            if (spirits_assigned_to_base.length < no_of_harvesters_req) {
                // if we dont have the no of spirits required then we use inefficient
                // harvesting method
                console.log("inefficient harvesting mode");
                harvesting_method = HarvestingMethod.inefficient;
                inefficient_harvesting(
                    spirits_assigned_to_base,
                    base,
                    closest_star
                );
            } else {
                // Efficient harvesting method
                console.log("Efficient harvesting mode");
                let bridge_positions: pos[] = bridge_pos(
                    base.position,
                    closest_star.position,
                    no_of_harvesters_req
                );
                console.log(
                    "bridge_positions length " + bridge_positions.length
                );
                console.log(
                    "bridge_positions " +
                        "x" +
                        bridge_positions[0].x +
                        "y" +
                        bridge_positions[0].y
                );

                // Assign the spirits to be harvesters
                for (let i = 0; i < no_of_harvesters_req; i++) {
                    console.log(
                        "assigned spirit to be harvester " +
                            spirits_assigned_to_base[i].id
                    );
                    spirits_assigned_to_base[i].mark.job = SpiritJob.harvest;
                    spirits_assigned_to_base[i].mark.target =
                        bridge_positions[i];
                    // Assigning energy target and SOURCE
                    // Assign target
                    if (i - 1 < 0) {
                        spirits_assigned_to_base[i].mark.energizeTarget = base;
                    } else {
                        spirits_assigned_to_base[i].mark.energizeTarget =
                            spirits_assigned_to_base[i - 1];
                    }
                    // Assign source
                    if (i + 2 > no_of_harvesters_req) {
                        spirits_assigned_to_base[i].mark.energizeSource =
                            spirits_assigned_to_base[i];
                    } else {
                        spirits_assigned_to_base[i].mark.energizeSource =
                            undefined;
                    }
                }
            }
        }

        // I can add more logic into how the spirits can be assigned different jobs

        // Harvesters
        if (harvesting_method == HarvestingMethod.bridge) {
            harvester_spirits(spirits_assigned_to_base);
        }
    }

    // update the memory on the spirit info
    for (let spirit of my_spirits) {
        memory.spirit_info.set(spirit.id, spirit.mark);
    }
}

main();
