/**
 * A series of RegExp helpers for identifying the contents of a cell
 */

/**
 * Returns if a string is a definition of a note. e.g. 'A4'
 * @param val Contents of a cell as a string
 * @return If val is a definition of a note
 */
export function isNote(val: string): boolean {
    var re = new RegExp('^[A-Z](#|b|)[1-9]$');
    return re.test(val);
}

/**
 * Returns if a string is a definition of a turtle. e.g. '!turtle(A1, r m3, 0.5)'
 * @param val Contents of a cell as a string
 * @return If val is a definition of a turtle
 */
export function isTurtle(val: string): boolean {
    var re = new RegExp('^(!turtle\().*(\))$');
    return re.test(val);
}

/**
 * If a string is an Excel cell address e.g. "AA14"
 * @param val
 * @return if val is an Excel cell address
 */
export function isCell(val: string): boolean {
    var re = new RegExp('^ *[a-zA-Z]+[0-9]+ *$')
    return re.test(val)
}

/**
 * Identifies if a string represents a subdivision with multiple notes/rests e.g. " ,c3,d3,s"
 * @param s a string
 * @return If s is multple notes / rests
 */
export function isMultiNote(s: string): boolean {
    if (typeof s != 'string') {
        return false;
    }
    if (!(s.includes(','))) {
        return false;
    }
    var arr = s.replace(/ /g,'').split(',');
    for (let val of arr) {
        if (!isNote(val) && !(val=="") && !(val=='s')){
            return false
        }
    }
    return true;
}

/**
 * If a string is defining a change or direction for a turtle
 * @param s a string
 * @return if it is a turtle direction change definition
 */
export function isDirChange(s: string): boolean {
    return RegExp(/^(r|l|n|e|s|w)$/).test(s);
}

/**
 * If a string is musical dynamic / volume
 * @param s a string
 * @return if it is a dynamic
 */
export function isDynamic(s: string) : boolean {
    s = s.toLowerCase();
    return RegExp(/^(ppp|pp|p|mp|mf|f|ff|fff)$/).test(s);
}