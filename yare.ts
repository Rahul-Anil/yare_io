import { unzipSync } from "zlib";

{
    type Pos = {
        x: number;
        y: number;
    };

    class helperFunctions {
        // Calculate the distance b/w 2 points
        sqDist(coordA, coordB) {
            return Math.pow(
                Math.pow(coordA[0] - coordB[0], 2) +
                    Math.pow(coordA[1] - coordB[1], 2),
                0.5
            );
        }

        // Helper function to print the contents of a map for debug
        printMap<K, V>(map: Map<K, V>): void {
            console.log("Map contents:");
            map.forEach((value, key) => {
                console.log(`${key.toString()} => ${value.id.toString()}`);
            });
        }

        /*
            Initial Calculation
            1. Calculate the distance between all bases and stars
            2. Set the initial spiritInfo as a map and save it to memory
            2. Save the base_star_map_dist to memory
        */

        // Calculate the distance b/w all basses and stars
        setBaseStarDistMap(base_list: Base[], star_list: Star[]) {
            let baseStarMapDist = new Map();
            for (let base of base_list) {
                let starMap = new Map();
                for (let star of star_list) {
                    let dist: number = this.sqDist(
                        base.position,
                        star.position
                    );
                    starMap.set(star, dist);
                }
                baseStarMapDist.set(base.id, starMap);
            }
            memory.baseStarMapDist = baseStarMapDist;
        }
    }

    type baseInfo = {
        name: string;
        noOfBridgeHarvesters: number;
    };

    class baseEntities {
        allBaseList: Base[] = [base_zxq, base_a2c, base_p89, base_nua];
        myBaseList: Base[] = new Array();
        enemyBaseList: Base[] = new Array();
        neutralBaseList: Base[] = new Array();

        constructor() {
            this.updateBaseOwnershipInfo();
        }

        // Update the ownership info of all bases
        updateBaseOwnershipInfo() {
            for (let base of this.allBaseList) {
                if (base.control == this_player_id) {
                    this.myBaseList.push(base);
                } else if (base.control == "") {
                    this.neutralBaseList.push(base);
                } else {
                    this.enemyBaseList.push(base);
                }
            }
        }
    }

    class starEntities {
        allStarList: Star[] = [star_zxq, star_a2c, star_p89, star_nua];
        energyWeight: number;
        energyCapacityWeight: number;
        energyRegenWeight: number;
        distWeight: number;
        helperFunc: helperFunctions;

        constructor(
            energyWeight: number = 1,
            energyCapacityWeight: number = 1,
            energyRegenWeight: number = 1,
            distWeight: number = 1
        ) {
            this.energyWeight = energyWeight;
            this.energyCapacityWeight = energyCapacityWeight;
            this.energyRegenWeight = energyRegenWeight;
            this.distWeight = distWeight;

            // Initialize helper func obj
            this.helperFunc = new helperFunctions();
        }

        // Order star in terms of preference
        starsInTermsOfPref(
            baseStarDistMap: Map<Star, number>
        ): Map<number, Star> {
            // Star preference map Map<number, star>
            let starPerfOrderingMap: Map<number, Star> = new Map();

            // Calculate the sum of all the properties of tha star to Normalize the values
            let [
                distListSum,
                currEnergyListSum,
                energyCapacityListSum,
                energyListRegenSum,
            ] = this.calculateSumOfStarProperty(baseStarDistMap);

            // Store preference value of star in map
            let starPrefMap: Map<Star, number> = new Map();
            // Calculate the preference of each star
            for (let [key, value] of baseStarDistMap) {
                let energyPref: number =
                    (key.energy / currEnergyListSum) * this.energyWeight;
                if (key.energy < key.energy_capacity * 0.5) {
                    energyPref = Infinity * -1;
                }
                let energyCapacityPerf: number =
                    (key.energy_capacity / energyCapacityListSum) *
                    this.energyCapacityWeight;
                let energyRegenPerf: number =
                    (key.regeneration / energyListRegenSum) *
                    this.energyRegenWeight;
                let distPerf: number =
                    (value / distListSum) * this.distWeight * -1;

                let totalPerf: number =
                    energyPref +
                    energyCapacityPerf +
                    energyRegenPerf +
                    distPerf;
                starPrefMap.set(key, totalPerf);
            }

            // Sort the starPrefMap in order of preference
            starPrefMap = new Map([...starPrefMap].sort((a, b) => b[1] - a[1]));

            // Store the starPrefMap in the starPrefOrderingMap
            let idx = 0;
            for (let [key, value] of starPrefMap) {
                starPerfOrderingMap.set(idx, key);
                idx++;
            }
            return starPerfOrderingMap;
        }

        // Calculate the sum of all the properties of tha star to Normalize the value
        private calculateSumOfStarProperty(baseStarDistMap): number[] {
            let distListSum: number = 0;
            let currEnergyListSum: number = 0;
            let energyCapacityListSum: number = 0;
            let energyListRegenSum: number = 0;

            for (let star of this.allStarList) {
                distListSum += baseStarDistMap.get(star);
                currEnergyListSum += star.energy;
                energyCapacityListSum += star.energy_capacity;
                energyListRegenSum += star.regeneration;
            }

            return [
                distListSum,
                currEnergyListSum,
                energyCapacityListSum,
                energyListRegenSum,
            ];
        }
    }

    enum SpiritJob {
        HARVEST,
        CHARGE,
        ATTACK,
        DEFEND,
        SCOUT,
        NO_JOB,
    }

    enum HarvestingMethod {
        BRIDGE,
        DIRECT,
    }

    type HarvestJobInfo = {
        harvestBridgeID?: number;
        harvestType: HarvestingMethod;
        harvestStar?: Star;
        harvestBase?: Base;
    };

    type SpiritInfo = {
        name?: string;
        belongsToBase?: Base;
        job: SpiritJob;
        moveTo?: Pos;
        energizeSource?: Base | Spirit | Star;
        energizeTarget?: Base | Spirit | Star;
        JobInfo?: HarvestJobInfo;
    };

    class spiritEntities {
        aliveSpirits: Spirit[];
        positionOfSpiritWithFixedLocation?: Map<Pos, Spirit>;
        baseInfo: baseEntities;
        helperFunc: helperFunctions;

        constructor(
            positionOfSpiritsWithFixedLocation:
                | Map<Spirit, Pos>
                | undefined = undefined
        ) {
            this.aliveSpirits = my_spirits.filter((spirit) => spirit.hp > 0);
            this.helperFunc = new helperFunctions();
            this.baseInfo = new baseEntities();
            this.positionOfSpiritWithFixedLocation = new Map();
        }

        /*
            Get the spirit info from memory and store it in mark if it exists otherwise
            initialize the spirit info with defaults
        */
        getMarksFromMemory() {
            for (let spirit of this.aliveSpirits) {
                // Get the mark if it exists in memory
                if (
                    memory.spiritInfo.size > 0 &&
                    memory.spiritInfo.has(spirit.id)
                ) {
                    spirit.mark = memory.spiritInfo.get(spirit.id);
                }
                // If new spirit or initial declaration, generate default spirit_info
                // and store it into mark
                if (!this.isSpiritInfo(spirit.mark)) {
                    // This is the default SpiritInfo that is going to be stored for a new
                    // spirit in mark
                    let spiritInfo: SpiritInfo = {
                        name: spirit.id,
                        belongsToBase: this.findClosestFriendlyBase(
                            spirit,
                            this.baseInfo.myBaseList
                        ),
                        job: SpiritJob.NO_JOB,
                        moveTo: undefined,
                        JobInfo: undefined,
                    };
                    // Store default SpiritInfo into mark
                    spirit.mark = spiritInfo;
                }
            }
        }

        getDeadSpirits(spirits: Spirit[] = my_spirits) {
            return spirits.filter((spirit) => spirit.hp <= 0);
        }

        // Check if the arg is of type SpiritInfo
        private isSpiritInfo(arg: any): arg is SpiritInfo {
            return (arg as SpiritInfo).name !== undefined;
        }

        // Find the base that is closest to the spirit
        private findClosestFriendlyBase(spirit: Spirit, my_base_list: Base[]) {
            let closestBase: Base | undefined = undefined;
            let closestDist: number = Infinity;
            for (let base of my_base_list) {
                let dist: number = this.helperFunc.sqDist(
                    spirit.position,
                    base.position
                );
                if (dist < closestDist) {
                    closestDist = dist;
                    closestBase = base;
                }
            }
            return closestBase;
        }
    }

    class harvestSpirits extends spiritEntities {
        harvestID: number;

        constructor() {
            super();
            if (!memory.harvestIDHighest) {
                this.harvestID = 0;
            } else {
                this.harvestID = memory.harvestIDHighest;
            }
        }

        // get the no of spirits required to harvest the star using bridge harvesting
        getNoOfSpiritsReqToHarvestStar_BRIDGE(base: Base, star: Star) {
            // <FUTURE> this can be done in a less expensive way bu using the map
            let distToStar = this.helperFunc.sqDist(
                base.position,
                star.position
            );
            return Math.ceil(distToStar / maxEnergizeDist);
        }

        // get the spirits that have the job of harvesting
        getHarvestingSpiritInBase(spirits: Spirit[]) {
            return spirits.filter(
                (spirit) => spirit.mark.job == SpiritJob.HARVEST
            );
        }

        // get the spirits that are bridge harvesters
        getBridgeHarvesters(spirits: Spirit[]) {
            return spirits.filter(
                (spirit) =>
                    spirit.mark.job == SpiritJob.HARVEST &&
                    spirit.mark.jobInfo.harvestType == HarvestingMethod.BRIDGE
            );
        }

        makeHarvestChainInvalidIfItContainsDeadSpirits(
            deadSpirits: Spirit[],
            unusedSpiritObj: unusedSpirits
        ) {
            for (let spirit in deadSpirits) {
                if (
                    spirit.mark.job == SpiritJob.HARVEST &&
                    spirit.mark.jobInfo.harvestType == HarvestingMethod.BRIDGE
                ) {
                    // Get the harvesting id of this spirit
                    let harvestID = spirit.mark.jobInfo.harvestBridgeID;
                    // Get all the bridge harvesters that have this id
                    let spiritsWithSameBridgeId =
                        this.getBridgeHarvestersWithBridgeID();
                    unusedSpiritObj.resetSpiritsToBeJobless(
                        spiritsWithSameBridgeId
                    );
                }
            }
        }

        private getBridgeHarvestersWithBridgeID(
            spirits: Spirit[] = this.aliveSpirits
        ): Spirit[] {
            return spirits.filter(
                (spirit) =>
                    spirit.mark.job == SpiritJob.HARVEST &&
                    spirit.mark.jobInfo.harvestType ==
                        HarvestingMethod.BRIDGE &&
                    spirit.mark.jobInfo.harvestBridgeID == this.harvestID
            );
        }

        // get the spirits that are direct harvesters
        private getDirectHarvesters(spirits: Spirit[]): Spirit[] {
            return spirits.filter(
                (spirit) =>
                    spirit.mark.job == SpiritJob.HARVEST &&
                    spirit.mark.jobInfo.harvestType == HarvestingMethod.DIRECT
            );
        }

        // Assign the spirits to be harvesters
        /*
            If the no of spirits required to harvest the star is less that the no of
            spirits then assign the spirits to be direct harvesters otherwise assign
            the spirits to be bridge harvesters
        */
        private assignHarvestingJobToSpirits(
            spirits: Spirit[],
            harvestingMethod: HarvestingMethod,
            noOfSpiritsRequired: number | undefined = undefined,
            baseToSupply: Base,
            starToHarvest: Star
        ) {
            // <TEMP></TEMP>
            console.log("no of spirits to assigned: " + spirits.length);

            if (harvestingMethod == HarvestingMethod.DIRECT) {
                this.assignDirectHarvestingDetailsToSpirits(
                    spirits,
                    baseToSupply,
                    starToHarvest
                );
            } else if (harvestingMethod == HarvestingMethod.BRIDGE) {
                for (let spirit of spirits.slice(0, noOfSpiritsRequired)) {
                    spirit.mark.job = SpiritJob.HARVEST;
                }
                this.assignBridgeHarvestingDetailsToSpirits(
                    spirits.slice(0, noOfSpiritsRequired),
                    baseToSupply,
                    starToHarvest
                );
                this.harvestID++;
            }
        }

        // Assign the spirits to be direct harvesters
        private assignDirectHarvestingDetailsToSpirits(
            spirits: Spirit[],
            baseToSupply: Base,
            starToHarvest: Star
        ) {
            for (let spirit of spirits) {
                spirit.mark.job = SpiritJob.HARVEST;
                let jobInfo: HarvestJobInfo = {
                    harvestBridgeID: undefined,
                    harvestType: HarvestingMethod.DIRECT,
                    harvestBase: baseToSupply,
                    harvestStar: starToHarvest,
                };
                spirit.mark.jobInfo = jobInfo;
            }
        }

        // Assign the spirits to be bridge harvesters
        private assignBridgeHarvestingDetailsToSpirits(
            spirits: Spirit[],
            baseToSupply: Base,
            starToHarvest: Star
        ) {
            // Get the position of the spirits on the bridge
            let bridgePos: Pos[] = this.getBridgePos(
                baseToSupply,
                starToHarvest,
                spirits.length
            );

            for (let i = 0; i < spirits.length; i++) {
                // Assign the spirit to be a harvester
                spirits[i].mark.job = SpiritJob.HARVEST;
                // Assign spirit job info
                let jobInfo: HarvestJobInfo = {
                    harvestBridgeID: this.harvestID,
                    harvestType: HarvestingMethod.BRIDGE,
                    harvestStar: starToHarvest,
                    harvestBase: baseToSupply,
                };
                spirits[i].mark.jobInfo = jobInfo;
                // Assign the spirit the position it needs to move to
                spirits[i].mark.moveTo = bridgePos[i];
                // Add the spirit and its position to the position
                this.positionOfSpiritWithFixedLocation?.set(
                    bridgePos[i],
                    spirits[i]
                );
                console.log(
                    "spirit move to: ",
                    spirits[i].mark.moveTo.x + " " + spirits[i].mark.moveTo.y
                );

                // Assign the targets the spirit needs to energize
                if (i - 1 < 0) {
                    spirits[i].mark.energizeTarget = baseToSupply;
                } else {
                    spirits[i].mark.energizeTarget = spirits[i - 1];
                }

                // Assign the source the spirit needs to energize from
                if (i + 2 > spirits.length) {
                    spirits[i].mark.energizeSource = spirits[i];
                } else {
                    spirits[i].mark.energizeSource = undefined;
                }
            }
        }

        private getBridgePos(
            baseToSupply: Base,
            starToHarvest: Star,
            noSpirits: number
        ): Pos[] {
            let spiritPositionOnBridge: Pos[] = new Array();
            let m1: number = 1;
            let m2: number = noSpirits;
            for (let i = 0; i < noSpirits; i++) {
                let x = Math.ceil(
                    (m1 * starToHarvest.position[0] +
                        m2 * baseToSupply.position[0]) /
                        (m1 + m2)
                );
                let y = Math.ceil(
                    (m1 * starToHarvest.position[1] +
                        m2 * baseToSupply.position[1]) /
                        (m1 + m2)
                );
                // // Need to check here if the position has been used by another spirits
                // if (
                //     this.positionOfSpiritWithFixedLocation?.has({ x: x, y: y })
                // ) {
                //     // if the position has already been occupied by another spirit then
                //     // shift the position by 5 in the x and y axis
                //     x += 15;
                //     y += 15;
                // }
                spiritPositionOnBridge.push({
                    x: x,
                    y: y,
                });
                m1++;
                m2--;
            }
            return spiritPositionOnBridge;
        }

        private performDirectHarvesting(spirits: Spirit[]) {
            for (let spirit of spirits) {
                // Set the base to supply and the star to harvest
                let baseToSupply = spirit.mark.jobInfo.harvestBase;
                let starToHarvest = spirit.mark.jobInfo.harvestStar;

                // Select the target to energize
                if (spirit.energy == spirit.energy_capacity) {
                    spirit.mark.energizeTarget = baseToSupply;
                }
                if (spirit.energy == 0) {
                    spirit.mark.energizeTarget = spirit;
                }

                // Movement to the target and choosing the target to energize
                if (spirit.mark.energizeTarget == baseToSupply) {
                    spirit.move(baseToSupply.position);
                    spirit.energize(spirit.mark.energizeTarget);
                }
                if (spirit.mark.energizeTarget == spirit) {
                    spirit.move(starToHarvest.position);
                    spirit.energize(spirit.mark.energizeTarget);
                }
            }
        }

        private performBridgeHarvesting(spirits: Spirit[]) {
            for (let spirit of spirits) {
                // Move to target position if spirit is not already there
                if (
                    spirit.position[0] != spirit.mark.moveTo.x &&
                    spirit.position[1] != spirit.mark.moveTo.y
                ) {
                    spirit.move([spirit.mark.moveTo.x, spirit.mark.moveTo.y]);
                } else {
                    // Spirit is at the target position then start harvesting loop
                    if (spirit.energy < spirit.energy_capacity * 0.2) {
                        if (spirit.mark.energizeSource !== undefined) {
                            spirit.energize(spirit.mark.energizeSource);
                        }
                    } else {
                        spirit.energize(spirit.mark.energizeTarget);
                    }
                }
            }
        }

        harvestSetup(
            base: Base,
            star: star,
            spirits: Spirit[],
            baseInfo: baseInfo,
            unusedSpiritObj: unusedSpirits
        ) {
            // This is the default harvesting method that is going to be used.
            let harvestingMethod: HarvestingMethod = HarvestingMethod.BRIDGE;

            // Get the no of spirits required to harvest the closest star by pref
            let noOfSpiritsReqToHarvestStar_BRIDGE =
                this.getNoOfSpiritsReqToHarvestStar_BRIDGE(base, star);

            console.log(
                "no of req for bridge: " + noOfSpiritsReqToHarvestStar_BRIDGE
            );

            // Check if i can perform bridge harvesting
            let directHarvesters = this.getDirectHarvesters(spirits);
            let noJobHarvesters = unusedSpiritObj.getUnusedSpirits(spirits);
            if (
                directHarvesters.length + noJobHarvesters.length <
                noOfSpiritsReqToHarvestStar_BRIDGE
            ) {
                console.log("Performing direct harvesting");
                harvestingMethod = HarvestingMethod.DIRECT;
            } else {
                /*
                    When switching from direct harvesting to bridge harvesting, all the spirits
                    are switched from being harvesters to being jobless so that they can be
                    reassigned
                */
                console.log("Performing Bridge harvesting");
                // This needs to be changed to the spirits that are assigned to the base
                // and are direct harvesters
                unusedSpiritObj.resetSpiritsToBeJobless(directHarvesters);
                baseInfo.noOfBridgeHarvesters++;
            }

            // Assign the spirits to be harvesters and assign the job info to them
            this.assignHarvestingJobToSpirits(
                unusedSpiritObj.getUnusedSpirits(spirits),
                harvestingMethod,
                noOfSpiritsReqToHarvestStar_BRIDGE,
                base,
                star
            );
            return baseInfo;
        }

        performHarvesting(spirits: Spirit[]) {
            let directHarvesters = this.getDirectHarvesters(spirits);
            console.log("Direct harvesters count: ", directHarvesters.length);
            this.performDirectHarvesting(directHarvesters);

            let bridgeHarvesters = this.getBridgeHarvesters(spirits);
            console.log("Bridge harvesters count: ", bridgeHarvesters.length);
            this.performBridgeHarvesting(bridgeHarvesters);
        }
    }

    class unusedSpirits extends spiritEntities {
        getUnusedSpirits(spiritsAssignedToBase: Spirit[]) {
            return spiritsAssignedToBase.filter(
                (spirit) => spirit.mark.job == SpiritJob.NO_JOB
            );
        }

        resetSpiritsToBeJobless(spirits: Spirit[]) {
            console.log("Spirits have been reset to be jobless");
            for (let spirit of spirits) {
                spirit.mark.job = SpiritJob.NO_JOB;
                spirit.mark.energizeSource = undefined;
                spirit.mark.energizeTarget = undefined;
                spirit.mark.JobInfo = undefined;
            }
        }
    }

    class attackSpirits extends spiritEntities {}

    // CONSTANT VARIABLES
    const maxEnergizeDist = 200; // The maximum distance that a spirit can energize

    function main() {
        console.log("TICK " + tick);
        // Get the information on ownership of all bases
        let baseInfo = new baseEntities();
        // Get the information on all stars
        let starInfo = new starEntities(1.5, 0.2, 1, 3);
        // Generate the helper function class object
        let helperFunc = new helperFunctions();

        // Perform calculation that will only happen on first tick and then be stored in mem
        if (tick == 1) {
            /*
                Initial Calculation
                1. Calculate the distance between all bases and stars
                2. Set the initial spiritInfo as a map and save it to memory
                2. Save the base_star_map_dist to memory
            */

            // This will set the baseStarMapDist in memory
            helperFunc.setBaseStarDistMap(
                baseInfo.myBaseList,
                starInfo.allStarList
            );

            // This will set the spiritInfo in memory
            memory.spiritInfo = new Map();
            memory.baseInfo = new Map();
            memory.fixedSpiritLocationInfo = new Map();
        }

        // Generate the spirit class object
        let spiritObj = new spiritEntities(memory.fixedSpiritLocationInfo);

        // Initialzie the inherited class of spiritEntities
        let harvestSpiritObj = new harvestSpirits();
        let unusedSpiritObj = new unusedSpirits();

        // Remove information on dead spirits
        let deadSpirits = spiritObj.getDeadSpirits();

        // Harvest Spirit dead
        harvestSpiritObj.makeHarvestChainInvalidIfItContainsDeadSpirits(
            deadSpirits,
            unusedSpiritObj
        );

        // Restore marks for spirits from memory
        spiritObj.getMarksFromMemory();

        /*
            Current Plan
            1. Spirit control on a per base list
        */
        for (let base of baseInfo.myBaseList) {
            console.log("BASE: ", base.id);

            let baseInfo: baseInfo;
            // Get base info from memory if present otherwise create new BaseInfo
            if (memory.baseInfo.has(base.id)) {
                baseInfo = memory.baseInfo.get(base.id);
            } else {
                baseInfo = {
                    name: base.id,
                    noOfBridgeHarvesters: 0,
                };
            }
            console.log(
                "Base Info noOfBridgeHarvesters: ",
                baseInfo.noOfBridgeHarvesters
            );

            // Get all spirits that are assigned to the base
            let spiritsAssignedToBase = spiritObj.aliveSpirits.filter(
                (spirit) => spirit.mark.belongsToBase.id == base.id
            );

            /*
                TODO:
                Check if any of the spirits are dead that are harvesters and have a harvest id
                if they are dead then all the spirits that have that are harvest id should be
                converted to harvesters that have no job and should wait for further instructions
            */

            // Get the dist of stars from current base
            let starDistMap = memory.baseStarMapDist.get(base.id);
            // Get the star preference ordering map
            let starPrefOrderingMap = starInfo.starsInTermsOfPref(starDistMap);
            console.log("starPrefOrderingMap: ");
            helperFunc.printMap(starPrefOrderingMap);

            // DECISION TREE STARTS HERE
            /*
                1. If there are no bridge harvesters then assign spirits to be bridge harvesters
                to the current base to the closest star
            */
            if (baseInfo.noOfBridgeHarvesters < 1) {
                harvestSpiritObj.harvestSetup(
                    base,
                    starPrefOrderingMap.get(0),
                    spiritsAssignedToBase,
                    baseInfo,
                    unusedSpiritObj
                );
            }

            // If there are unused spirits then assign them harvest the best star nearby
            // Later keep a second condition that this happens if there is no enemy nearby
            if (
                unusedSpiritObj.getUnusedSpirits(spiritsAssignedToBase).length >
                0
            ) {
                harvestSpiritObj.harvestSetup(
                    base,
                    starPrefOrderingMap.get(0),
                    spiritsAssignedToBase,
                    baseInfo,
                    unusedSpiritObj
                );
            }

            // all spirits that are assigned as harvesters will perform harvesting at this point
            harvestSpiritObj.performHarvesting(spiritsAssignedToBase);

            // Update memory
            // Save the baseInfo to memory
            memory.baseInfo.set(base.id, baseInfo);
        }

        // Update the memory on the spirit info
        for (let spirit of spiritObj.aliveSpirits) {
            memory.spiritInfo.set(spirit.id, spirit.mark);
        }
        memory.harvestIDHighest = harvestSpiritObj.harvestID;
    }

    main();
}
