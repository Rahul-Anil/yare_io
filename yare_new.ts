{
    type Pos = {
        x: number;
        y: number;
    };

    class helperFunctions {
        sqDist(coordA, coordB) {
            return Math.pow(
                Math.pow(coordA[0] - coordB[0], 2) +
                    Math.pow(coordA[1] - coordB[1], 2),
                0.5
            );
        }

        printMap<K, V>(map: Map<K, V>): void {
            console.log("Map contents:");
            map.forEach((value, key) => {
                console.log(`${key.id.toString()} => ${value.toString()}`);
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

        starsInTermsOfPref(
            baseStarDistMap: Map<Star, number>
        ): Map<number, Star> {
            // Star perference map Map<number, star>
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
        baseInfo: baseEntities;
        helperFunc: helperFunctions;

        constructor() {
            this.aliveSpirits = my_spirits.filter((spirit) => spirit.hp > 0);
            this.helperFunc = new helperFunctions();
            this.baseInfo = new baseEntities();
        }

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

        private isSpiritInfo(arg: any): arg is SpiritInfo {
            return (arg as SpiritInfo).name !== undefined;
        }

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
            this.harvestID = 0;
        }

        getNoOfSpiritsReqToHarvestStar_BRIDGE(base: Base, star: Star) {
            // <FUTURE> this can be done in a less expensive way bu using the map
            let distToStar = this.helperFunc.sqDist(
                base.position,
                star.position
            );
            return Math.ceil(distToStar / maxEnergizeDist);
        }

        getHarvestingSpiritInBase(spirits: Spirit[]) {
            return spirits.filter(
                (spirit) => spirit.mark.job == SpiritJob.HARVEST
            );
        }

        getBridgeHarvesters(spirits: Spirit[]) {
            return spirits.filter(
                (spirit) =>
                    spirit.mark.job == SpiritJob.HARVEST &&
                    spirit.mark.jobInfo.harvestType == HarvestingMethod.BRIDGE
            );
        }

        assignHarvestingJobToSpirits(
            spirits: Spirit[],
            harvestingMethod: HarvestingMethod,
            noOfSpiritsRequired: number | undefined = undefined,
            baseToSupply: Base,
            starToHarvest: Star
        ): Spirit[] {
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

        assignDirectHarvestingDetailsToSpirits(
            spirits: Spirit[],
            baseToSupply: Base,
            starToHarvest: Star
        ) {
            for (let spirit of spirits) {
                spirit.mark.job = SpiritJob.HARVEST;
                let jobInfo: HarvestJobInfo = {
                    harvestBridgeID: undefined,
                    harvestType: HarvestingMethod.DIRECT,
                };
                spirit.mark.jobInfo = jobInfo;
            }
        }

        assignBridgeHarvestingDetailsToSpirits(
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
                };
                spirits[i].mark.jobInfo = jobInfo;
                // Assign the spirit the position it needs to move to
                spirits[i].mark.moveTo = bridgePos[i];
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
                spiritPositionOnBridge.push({ x: x, y: y });
                m1++;
                m2--;
            }
            return spiritPositionOnBridge;
        }

        performDirectHarvesting(
            spirits: Spirit[],
            baseToSupply: Base,
            starToSupply: Star
        ) {
            for (let spirit of spirits) {
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
                    spirit.move(starToSupply.position);
                    spirit.energize(spirit.mark.energizeTarget);
                }
            }
        }

        performBridgeHarvesting(spirits: Spirit[]) {
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
    }

    class unusedSpirits extends spiritEntities {
        getUnusedSpirits(spiritsAssignedToBase: Spirit[]) {
            return spiritsAssignedToBase.filter(
                (spirit) => spirit.mark.job == SpiritJob.NO_JOB
            );
        }

        resetSpiritsToBeJobless(spirits: Spirit[]) {
            for (let spirit of spirits) {
                spirit.mark.job = SpiritJob.NO_JOB;
                spirit.mark.energizeSource = undefined;
                spirit.mark.energizeTarget = undefined;
                spirit.mark.JobInfo = undefined;
            }
        }
    }

    // CONSTANT VARIABLES
    const maxEnergizeDist = 100; // The maximum distance that a spirit can energize

    function main() {
        console.log("TICK " + tick);
        // Get the information on ownership of all bases
        let baseInfo = new baseEntities();
        // Get the information on all stars
        let starInfo = new starEntities(0.2, 0.2, 1, 5);
        // Generate the spirit class object
        let spiritObj = new spiritEntities();
        // Generate the helper function class object
        let helperFunc = new helperFunctions();

        // Initialzie the inherited class of spiritEntities
        let harvestSpiritObj = new harvestSpirits();
        let unusedSpiritObj = new unusedSpirits();

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
        }

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

            /*
                Things i have at this point 
                1. spiritsAssignedToBase
                2. starPrefOrderingMap

                What I want to do
                1. harvest multiple stars at once
                2. if the star can support it then harvest a single star with multiple harvest chains
            */

            /*
                Strategy 1:
                Unless the no of spirits that belong to the base become 1 then harvest
                the closest star
            */

            // get count of no of spirits that belong to the base
            let noOfSpiritsAssignedToBase = spiritsAssignedToBase.length;
            console.log(
                "no of spirits assigned to base: ",
                noOfSpiritsAssignedToBase
            );

            let noOfHarvestersAssignedToBase =
                harvestSpiritObj.getHarvestingSpiritInBase(
                    spiritsAssignedToBase
                ).length;
            console.log(
                "no of harvest spirits assigned to base: " +
                    noOfHarvestersAssignedToBase
            );

            // DECISION TREE STARTS HERE

            // Check if the no of spirits is >=1 in the base
            if (baseInfo.noOfBridgeHarvesters < 1) {
                // For this strategy we will default to using bridge harvesting
                let harvestingMethod: HarvestingMethod =
                    HarvestingMethod.BRIDGE;
                // Get the no of spirits required to harvest the closest star by pref
                let noOfSpiritsReqToHarvestStar_BRIDGE =
                    harvestSpiritObj.getNoOfSpiritsReqToHarvestStar_BRIDGE(
                        base,
                        starPrefOrderingMap.get(0)
                    );

                console.log(
                    "no of spirits req for bridge: " +
                        noOfSpiritsReqToHarvestStar_BRIDGE
                );

                if (
                    noOfHarvestersAssignedToBase <
                    noOfSpiritsReqToHarvestStar_BRIDGE
                ) {
                    /*
                        No of spirits required to perform bridge harvesting is less than
                        the no of spirits that belong to the base so will switch to direct
                        harvesting till the no of spirits assigned to the base is equal to
                        the no of spirits required to harvest the closest star using bridge
                    */
                    harvestingMethod = HarvestingMethod.DIRECT;
                } else {
                    /*
                        If we start of as direct harvesting then all spirits will be assigned to
                        harvest the closest star
                        All spirits will be assiged as harvesters and when looking for spirits to perform
                        bridge harvesting we will not have any left
                        so reset all spirits to be jobless
                    */
                    unusedSpiritObj.resetSpiritsToBeJobless(
                        spiritsAssignedToBase
                    );
                }

                // Need to set spirits to be harvesters
                harvestSpiritObj.assignHarvestingJobToSpirits(
                    unusedSpiritObj.getUnusedSpirits(spiritsAssignedToBase),
                    harvestingMethod,
                    noOfSpiritsReqToHarvestStar_BRIDGE,
                    base,
                    starPrefOrderingMap.get(0)
                );

                // Based on harvesting method assign harvesting details to spirits
                if (harvestingMethod == HarvestingMethod.DIRECT) {
                    console.log("DIRECT HARVESTING");
                    // Set the enerigize target of the spirit to be the closest stae
                    harvestSpiritObj.performDirectHarvesting(
                        harvestSpiritObj.getHarvestingSpiritInBase(
                            spiritsAssignedToBase
                        ),
                        base,
                        starPrefOrderingMap.get(0)
                    );
                } else {
                    baseInfo.noOfBridgeHarvesters++;
                }
            }

            console.log("BRIDGE HARVESTING");
            // Get the sprits that are assigned to harvest and are bridte harvesters
            let bridgeHarvesters = harvestSpiritObj.getBridgeHarvesters(
                spiritsAssignedToBase
            );
            console.log("Bridge harvesters count: ", bridgeHarvesters.length);
            harvestSpiritObj.performBridgeHarvesting(bridgeHarvesters);

            // Save the baseInfo to memory
            memory.baseInfo.set(base.id, baseInfo);
        }

        // Update the memory on the spirit info
        for (let spirit of spiritObj.aliveSpirits) {
            memory.spiritInfo.set(spirit.id, spirit.mark);
        }
    }

    main();
}
