enum SpiritJob {
    harvest,
    charge,
}

type SpiritInfo = {
    belongs_to_base: BaseAudioContext;
    is_alive: boolean;
    job: SpiritJob;
};

// Get the info of which base is mine, which is enemy's, and which is neutral
function all_base_info(): [Base[], Base[], Base[]] {
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
        console.log(`${key.toString()} => ${value.toString()}`);
    });
}

// Get the dist b/w all the stars and all the bases
function star_base_dist() {
    let star_base_dict = new Map();
    //List of all stars
    let all_stars = [star_zxq, star_a2c, star_p89, star_nua];
    let all_base = [base_zxq, base_a2c, base_p89, base_nua];

    for (let base of all_base) {
        // Map that will contain the starid => dist
        let star_map = new Map();
        for (let star of all_stars) {
            // find distance b/w the star and the bases
            let dist: number = sq_dist(base.position, star.position);
            star_map.set(star.id, dist);
        }
        star_base_dict.set(base.id, star_map);
    }
    return star_base_dict;
}

// function main
function main() {
    // Get the info of all bases
    let [my_base_list, enemy_base_list, neutral_base_list] = all_base_info();

    // distance of each star to each base
    let all_star_base_dict = star_base_dist();

    for (let base of my_base_list) {
        console.log("base id: ", base.id);

        let friends_near_base = base.sight.friends;
        console.log("friends near base: " + friends_near_base);
        let enemies_near_base = base.sight.enemies;
        console.log("enemies near base: " + enemies_near_base);
        let structures_near_base = base.sight.structures;
        console.log("structures near base: " + structures_near_base);
    }
}

main();
