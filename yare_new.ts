{
    type Pos = {
        x: number;
        y: number;
    };

    /**
     * Returns the distance between two points.
     *
     * @param coordA - the fist point in the form [x, y]
     * @param coordB - the second point in the form [x, y]
     * @returns the distance between the 2 points
     */
    function sqDist(coordA: number[], coordB: number[]): number {
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
    function printMap(map: Map<K, V>, mapName: string): void {
        console.log("Printing map: ", mapName);
        map.forEach((value, key) => {
            console.log(`${key.toString()} => ${value.id.toString()}`);
        });
    }

    /**
     * Normalize a value to b/w 0 and 1 given a range of values
     *
     * @param x Value that has to be normalized
     * @param min Min value of the range
     * @param max Max value of the range
     * @returns Normalized value
     */
    function normalizeValue(x: number, min: number, max: number): number {
        return (x - min) / (max - min);
    }

    /**
     * Sort map by value in descending order
     *
     * @param map Map that has to be sorted with key being any type and value being a
     * number
     * @returns Sorted map by value in descending order
     */
    function sortMapByValue(map: Map<K, number>): Map<K, number> {
        return new Map([...map.entries()].sort((a, b) => a[1] - b[1]));
    }

    /**
     * Function that is called to run jobs on the first tick
     *
     * @remarks This function is called only on the first tick
     *
     * @param tick the current tick
     * @param starObj an obj of the star class
     * @returns void
     */
    function initialTickJobs(starObj: sta, gameStateObj: gameState): void {
        // If memory game state is not initialized, then initialize it
        console.log("HERE");
        memory.gameState = gameStateObj.initializeGameState(starObj);
    }

    interface gameStateMemory {
        allStarDistFromAllBase: Map<Base, Map<Star, number>>;
    }

    class gameState {
        allStarDistFromAllBase: Map<Base, Map<Star, number>>;

        /**
         * Initialize the game state
         *
         * @param starObj Object of the star class
         * @returns A fresh game state
         */
        initializeGameState(starObj: star): gameStateMemory {
            // Initalize the allStarDistFromAllBase map
            this.allStarDistFromAllBase = starObj.getAllStarDistFromAllBases();
            let initGameState: gameStateMemory = {
                allStarDistFromAllBase: this.allStarDistFromAllBase,
            };
            return initGameState;
        }

        /**
         * Load the game state from memory
         *
         * @param gameStateMemory the game state that is stored in memory
         * @returns void
         */
        loadGameStateFromMemory(gameStateMemory: gameStateMemory): void {
            if (!gameStateMemory) {
                console.log("ERROR: could not load game state from memory");
                return undefined;
            }
            this.allStarDistFromAllBase =
                gameStateMemory.allStarDistFromAllBase;
        }

        /**
         * Save the game state to memory
         *
         * @returns void
         */
        saveGameStateToMemory(): void {
            let currGameState: gameStateMemory = {
                allStarDistFromAllBase: this.allStarDistFromAllBase,
            };
            memory.gameState = currGameState;
        }
    }

    class base {
        baseList: Base[] = [base_zxq, base_a2c, base_p89, base_nua];

        /**
         * Get the ownership status of all the bases on the map
         *
         * @remarks This function is called every tick
         *
         * @returns map of bases and which player owns them
         */
        private getBaseOwnership(): Map<String, Base[]> {
            let baseOwnership: Map<String, Base[]> = new Map();

            let myBases: Base[] = [];
            let enemyBases: Base[] = [];
            let neutralBases: Base[] = [];

            for (let base of this.baseList) {
                if (base.control == this_player_id) {
                    myBases.push(base);
                } else if (base.control == "") {
                    neutralBases.push(base);
                } else {
                    enemyBases.push(base);
                }
            }

            baseOwnership.set("myBases", myBases);
            baseOwnership.set("neutralBases", neutralBases);
            baseOwnership.set("enemyBases", enemyBases);

            return baseOwnership;
        }
    }

    class star {
        starList: Star[] = [star_zxq, star_a2c, star_p89, star_nua];

        /**
         * Get max and min dist of all stars from the base. This is used to normalize
         * the dist of all stars from the base
         *
         * @param distOfStarsFromBase Dist of all stars from the base
         * @returns Obj with min and max dist from base
         */
        private getMaxAndMinDistFromBase(
            distOfStarsFromBase: Map<Star, number>
        ): { min: number; max: number } {
            let minDist = Math.min(...distOfStarsFromBase.values());
            let maxDist = Math.min(...distOfStarsFromBase.values());
            return { min: minDist, max: maxDist };
        }

        /**
         * Get max and min energy of all stars from the base. This is used to normalize
         * the dist of all stars from the base
         *
         * @returns Obj with min and max energy of all stars
         */
        private getMaxAndMinEnergyOfStars() {
            let minEnergy = Math.min(
                ...this.starList.map((star) => star.energy)
            );
            let maxEnergy = Math.max(
                ...this.starList.map((star) => star.energy)
            );
            return { min: minEnergy, max: maxEnergy };
        }

        /**
         * Get max and min energy regen of all stars from the base. This is used to
         * normalize the dist of all stars from the base
         *
         * @returns Obj with min and max energy regen of all stars
         */
        private getMinAndMaxEnergyRegenOfStars() {
            let minEnergyRegen = Math.min(
                ...this.starList.map((star) => star.regeneration)
            );
            let maxEnergyRegen = Math.max(
                ...this.starList.map((star) => star.regeneration)
            );
            return { min: minEnergyRegen, max: maxEnergyRegen };
        }

        getPreferenceValueOfStars(
            distOfStarsFromBase: Map<Star, number>,
            energyWeight: number,
            energyCapacityWeight: number,
            energyRegenWeight: number,
            distWeight: number
        ): Map<Star, number> {
            let preferenceValueOfStars: Map<Star, number> = new Map();

            // Get min and max value of all parameters
            let { min: minDist, max: maxDist } =
                this.getMaxAndMinDistFromBase(distOfStarsFromBase);
            let { min: minEnergy, max: maxEnergy } =
                this.getMaxAndMinEnergyOfStars();
            let { min: minEnergyRegen, max: maxEnergyRegen } =
                this.getMinAndMaxEnergyRegenOfStars();
            let [minEnergyCapacity, maxEnergyCapacity] = [1000, 3000];

            for (let [star, dist] of distOfStarsFromBase) {
                let preferenceValue = normalizeValue(
                    star.energy,
                    minEnergy,
                    maxEnergy
                );
                +normalizeValue(
                    star.regeneration,
                    minEnergyRegen,
                    maxEnergyRegen
                ) +
                    normalizeValue(
                        star.energyCapacity,
                        minEnergyCapacity,
                        maxEnergyCapacity
                    ) -
                    normalizeValue(dist, minDist, maxDist);
                preferenceValueOfStars.set(star, preferenceValue);
            }
            return preferenceValueOfStars;
        }

        /**
         * Find distances b/w all bases and all the stars
         *
         * @remarks This function is called only on the first tick
         *
         * @returns a map of all the bases and their distances to all the stars on the map
         */
        getAllStarDistFromAllBases(): Map<Base, Map<Star, number>> {
            let baseList: Base[] = [base_zxq, base_a2c, base_p89, base_nua];
            let distMap: Map<Base, Map<Star, number>> = new Map();
            for (let base of baseList) {
                let distStarFromBaseMap: Map<Star, number> = new Map();
                for (let star of this.starList) {
                    distStarFromBaseMap.set(
                        star,
                        sqDist(base.position, star.position)
                    );
                }
                distMap.set(base, distStarFromBaseMap);
            }
            return distMap;
        }
    }

    class spirit {}

    function main() {
        console.log("Current Tick: ", tick);

        let gameStateObj: gameState = new gameState();

        let baseObj: base = new base();
        let starObj: star = new star();

        // Calculations that must be made every tick
        let baseOwnership: Map<String, Base[]> = baseObj.getBaseOwnership();

        if (tick == 1) {
            initialTickJobs(starObj, gameStateObj);
        } else {
            // Load the game state from memory
            gameStateObj.loadGameStateFromMemory(memory.gameState);
        }
    }

    main();
}
