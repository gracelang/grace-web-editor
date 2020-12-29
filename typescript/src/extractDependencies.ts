export function extractDependencies(graceProgram:String):String[] {
    let limit:number = 10;
    let previousLimit:number = 0;
    let dependents:String[] = [];
    let dialectFound:Boolean = false;
    while (true) {
        const startingLines = graceProgram.split('\n', limit);
        if (startingLines.length <= previousLimit) {
            return dependents;
        }
        for (let ix:number = previousLimit; ix < limit; ix++) {
            let line = startingLines[ix];
            var match = dependencyStmt.exec(line);
            if (match) {
                if (match[1] == 'dialect') {
                    recordDialect(match[2]);
                } else if (match[1] == 'import') {
                    recordImport(match[2]);
                } else {
                    throw "impossible match";
                }
            }
            if (nonPreambleStmt.test(line)) {
                return dependents;
            }
        }
        previousLimit = limit;
        limit = limit * 2;
    }
    throw "impossible happened";
    function recordImport(moduleName:String) {
        if (! dialectFound) {
            // no dialect statement implies the 'standard' dialect
            dialectFound = true;
            dependents.push('standard');
        }
        dependents.push(moduleName);
    }
    function recordDialect(moduleName:String) {
        dialectFound = true;
        if (moduleName != 'none') {
            dependents.push(moduleName);
        }
    }
};

const dependencyStmt = /^(dialect|import) *"([^"]+)"/;
const nonPreambleStmt = /class|def|method|object|once|trait|type|var/;