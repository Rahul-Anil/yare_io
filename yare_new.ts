{
    type Pos = {
        x: number;
        y: number;
    };

    class helperFunctions {
        /**
         * Returns the distance between two points.
         *
         * @param coordA - the fist point in the form [x, y]
         * @param coordB - the second point in the form [x, y]
         * @returns the distance between the 2 points
         */
        sqDist(coordA: number[], coordB: number[]): number {
            return Math.pow(
                Math.pow(coordA[0] - coordB[0], 2) +
                    Math.pow(coordA[1] - coordB[1], 2),
                0.5
            );
        }

        /**
         * Prints Maps
         *
         * @param map - the map to print
         * @param mapName - the name of the map to print
         * @returns void
         */
        printMap(map: Map<K, V>, mapName: string): void {
            console.log("Printing map: ", mapName);
            map.forEach((value, key) => {
                console.log(`${key.toString()} => ${value.id.toString()}`);
            });
        }

        /**
         * Calculates the distance between all bases and all stars and stores it in
         * a map in memory.
         *
         * @remark This function is called in tick 0 and then never again.
         *
         * @param baseList - the list of all bases
         * @param starList - the list of all stars
         * @returns void
         */
        setBaseStarDistMap(baseList: Base[], starList: Star[]): void {
            let baseStarDistMap: Map<Base, Map<Star, number>> = new Map();
            for (let base of baseList) {
                let starMap = new Map();
                for (let star of starList) {
                    let dist: number = this.sqDist(
                        base.position,
                        star.position
                    );
                    starMap.set(star, dist);
                }
                baseStarDistMap.set(base, starMap);
            }
            memory.baseStarDistMap = baseStarDistMap;
        }
    }

    type baseInfo = {
        name: string;
        noOfBridgeHarvesters: number;
    };

    class baseEntities {
        allBaseList: Base[] = [base_zxq, base_a2c, base_p89, base_nua];
        myBaseList: Base[] = [];
        enemyBaseList: Base[] = [];
        neutralBaseList: Base[] = [];

        /**
         * Constructor will update call the updateBaseOwnership function
         */
        constructor() {
            this.updateBaseOwnership();
        }

        /**
         * Get the ownership status of all the bases in the game and update the base
         * class lists
         *
         * @reuturn void
         */
        updateBaseOwnership(): void {
            this.allBaseList.forEach((base) => {
                if (base.control == this_player_id) {
                    this.myBaseList.push(base);
                } else if (base.control == "") {
                    this.neutralBaseList.push(base);
                } else {
                    this.enemyBaseList.push(base);
                }
            });
        }
    }

    class starEntities {
        allStarList: Star[] = [star_zxq, star_a2c, star_p89, star_nua]; 

        // Star energy preference calculation weights
        energyWeight: number:
        energyCapacityWeight: number;
        energyRegenWeight: number;
        distWeight: number;

        // Helper function class keyboard
        helperFunc: helperFunctions;

        /**
         * Constructor will initialize the helper function obj and sets the weights 
         * on how star energy is decided
         * 
         * @param energyWeight - the weight pref given to the energy of the star
         * @param energyCapacityWeight - the weight pref given to the energy capacity of the star
         * @param energyRegenWeight - the weight pref given to the energy regen of the star
         * @param distWeight - the weight pref given to the distance from the star
         */
        constructor(energyWeight: number = 1, energyCapacityWeight: number = 1, energyRegenWeight: number = 1, distWeight: number = 1) {
            this.energyWeight = energyWeight;
            this.energyCapacityWeight = energyCapacityWeight;
            this.energyRegenWeight = energyRegenWeight;
            this.distWeight = distWeight;
            this.helperFunc = new helperFunctions();
        }

        /**
         * Calculates the sum of all the properties of the star to Normalize values
         *  
         * @param baseStarDistMap - the map of dist of all stars from the base
         * @return an array of all the sum of the properties of the star
         */
        private calculateSumOfStarProperties(baseStarDistMap: Map<Star, number>): number[] {}

        getStarsInTermsOfPerf(baseStarDistMap: Map<Star, number>): Map<number, Star>{
            let starPrefOrderingMap: Map<number, Star> = new Map();
            
            // Calculate the sum of all the properties of the star to Normalize the values
            let [
                distListSum,
                currEnergyListSum,
                energyCapacityListSum,
                energyListRegenSum
            ] = this.calculateSumOfStarProperties(baseStarDistMap);
        }
        
    }
}
