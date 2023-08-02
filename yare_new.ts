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
    }
}
