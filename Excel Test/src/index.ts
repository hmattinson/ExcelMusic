import * as OfficeHelpers from '@microsoft/office-js-helpers';
import * as Tone from 'tone';

$("#run").click(() => tryCatch(run));
$("#stop").click(() => tryCatch(stop));
$("#test").click(() => tryCatch(test));

var piano: Tone.Sampler;

/**
 * Run when play button pressed. Starts playback of music
 */
async function run() {
    await Excel.run(async (context) => {

        const selectedRange = context.workbook.getSelectedRange();
        selectedRange.load("values");

        var sheetSelectHTMLElement = (document.getElementById("sheet_select")) as HTMLSelectElement;
        var sheetChoice = sheetSelectHTMLElement.options[sheetSelectHTMLElement.selectedIndex].value;
        const sheet: Excel.Range = context.workbook.worksheets.getItem(sheetChoice).getUsedRange();
        sheet.load('values');

        await context.sync();

        highlightSheet(sheet);

        Tone.context = new AudioContext();
        Tone.Transport.bpm.value = getBPM(sheet.values);

        piano = new Tone.Sampler({
            'A0' : 'A0.[mp3|ogg]',
            'C1' : 'C1.[mp3|ogg]',
            'D#1' : 'Ds1.[mp3|ogg]',
            'F#1' : 'Fs1.[mp3|ogg]',
            'A1' : 'A1.[mp3|ogg]',
            'C2' : 'C2.[mp3|ogg]',
            'D#2' : 'Ds2.[mp3|ogg]',
            'F#2' : 'Fs2.[mp3|ogg]',
            'A2' : 'A2.[mp3|ogg]',
            'C3' : 'C3.[mp3|ogg]',
            'D#3' : 'Ds3.[mp3|ogg]',
            'F#3' : 'Fs3.[mp3|ogg]',
            'A3' : 'A3.[mp3|ogg]',
            'C4' : 'C4.[mp3|ogg]',
            'D#4' : 'Ds4.[mp3|ogg]',
            'F#4' : 'Fs4.[mp3|ogg]',
            'A4' : 'A4.[mp3|ogg]',
            'C5' : 'C5.[mp3|ogg]',
            'D#5' : 'Ds5.[mp3|ogg]',
            'F#5' : 'Fs5.[mp3|ogg]',
            'A5' : 'A5.[mp3|ogg]',
            'C6' : 'C6.[mp3|ogg]',
            'D#6' : 'Ds6.[mp3|ogg]',
            'F#6' : 'Fs6.[mp3|ogg]',
            'A6' : 'A6.[mp3|ogg]',
            'C7' : 'C7.[mp3|ogg]',
            'D#7' : 'Ds7.[mp3|ogg]',
            'F#7' : 'Fs7.[mp3|ogg]',
            'A7' : 'A7.[mp3|ogg]',
            'C8' : 'C8.[mp3|ogg]'
            }, {
            'release' : 1,
            'baseUrl' : '../assets/samples/salamander/',
            'onload': function() {
                runTurtles(sheet.values);
                Tone.Transport.start("+0.1");
            }
        }).toMaster();
        
        // console.log(`The range values "${selectedRange.values}".`);
    });
}

/**
 * Stops music playback
 */
async function stop() {
    await Excel.run(async (context) => {
        Tone.context.close();
    });
}

// Won't be in final version but useful for development
async function test() {
    await Excel.run(async (context) => {
        var sheetSelectHTMLElement = (document.getElementById("sheet_select")) as HTMLSelectElement;
        var sheetChoice = sheetSelectHTMLElement.options[sheetSelectHTMLElement.selectedIndex].value;
        const sheet: Excel.Range = context.workbook.worksheets.getItem(sheetChoice).getUsedRange();
        sheet.load('values');

        await context.sync();

        var sheetValues = sheet.values;

        Tone.context = new AudioContext();
        Tone.Transport.bpm.value = getBPM(sheet.values);

        // console.log(piano)

        // piano.triggerAttackRelease('D5', "0:0:2", "0:4:0");
        // var synthPart = new Tone.Part(function(time, note){
        //     console.log(time, note);
        //     piano.triggerAttackRelease(note[0], note[1], time);
        // }, [["0:0:0",['C5', "0:1:0"]], ["0:1:0",['D5',"0:2:0"]], ["0:3:0",['F5',"0:1:0"]]]).start();

        Tone.Transport.start("+0.1");
    });
}

/**
 * Returns if a string is a definition of a note. e.g. 'A4'
 * @param val Contents of a cell as a string
 * @return If val is a definition of a note
 */
function isNote(val: string): boolean {
    var re = new RegExp('^[A-Z](#|b|)[1-9]$');
    return re.test(val);
}

/**
 * Returns if a string is a definition of a turtle. e.g. '!turtle(A1, r m3, 0.5)'
 * @param val Contents of a cell as a string
 * @return If val is a definition of a turtle
 */
function isTurtle(val: string): boolean {
    var re = new RegExp('^(!turtle\().*(\))$');
    return re.test(val);
}

/**
 * If a string is an Excel cell address e.g. "AA14"
 * @param val
 * @return if val is an Excel cell address
 */
function isCell(val: string): boolean {
    var re = new RegExp('^ *[a-zA-Z]+[0-9]+ *$')
    return re.test(val)
}

/**
 * Checks selected sheet for cells that can be highlighted
 * @param val Used range of the worksheet
 */
function highlightSheet(sheet: Excel.Range): void {
    var sheetVals = sheet.values;
    var rows = sheetVals.length;
    var cols = sheetVals[0].length;

    for (var row = 0; row < rows; row++){
        for (var col = 0; col < cols; col++){
            var value = sheetVals[row][col]
                // Highlight notes red
                if (isNote(value)) {
                    sheet.getCell(row,col).format.fill.color = "#FFada5";
                }
                // Highlight sustains a lighter red
                else if (value == "s"){
                    sheet.getCell(row,col).format.fill.color = "#FFd6d6";
                }
                // Highlight turtles green
                else if (isTurtle(value)) {
                    sheet.getCell(row, col).format.fill.color = "#a8ffd0";
                }
                // Else remove highlighting
                else {
                    sheet.getCell(row, col).format.fill.clear();
                }
        }
    }
}

/**
 * INCOMPLETE, find bpm as defined in spreadsheet
 * @param sheetVals the values in the used spreadsheet range
 * @return the beats per minute
 */
function getBPM(sheetVals: any[][]): number {
    return 160;
}

/**
 * Takes a list of cell values and creates a list of time and note pairs for Tone Part playback
 * @param values List of notes as strings e.g. ['A4','A5']
 * @param speedFactor Multipication factor for playback speed
 * @return If val is a definition of a note
 */
function createNoteTimes(values: string[]): [[string, [string, string]][],number] {
    var len = values.length;
    // find how many notes are defined
    var notesCount = 0;
    for(let value of values){
        if(isNote(value)){
            notesCount++;
        }
    }
    var noteSequence: [string, [string, string]][] = new Array(notesCount);

    var beatCount = 0; // how many cells through
    var noteCount = 0; // how many notes through
    var noteLength = 0; // for keeping track of note sustain
    var inRest = true // if the current value in the trace is a rest (else we're in a note)
    var currentStart: string; // start time of note currently in
    var currentNote: string; // note currently being played

    for (let value of values) {
        if(isNote(value)){
            if(inRest){
                // Rest -> Note
                // start new note
                currentStart = "0:" + beatCount + ":0";
                currentNote = value;
                noteLength = 1;
                inRest = false;
            }
            else{
                // Note -> Note
                // end current note
                noteSequence[noteCount++] = [currentStart, [currentNote, "0:" + noteLength + ":0"]]
                // start new note
                currentStart = "0:" + beatCount + ":0";
                currentNote = value;
                noteLength = 1;
            }
        }
        else if(value == null){ //rest
            if(!inRest){
                // Note -> Rest
                // end current note
                noteSequence[noteCount++] = [currentStart, [currentNote, "0:" + noteLength + ":0"]];
                inRest = true;
            }
        }
        else if(value == 's'){
            // x -> x
            noteLength++;
        }
        beatCount++
    }
    // add note if we finished in a note
    if(!inRest){
        noteSequence[noteCount++] = [currentStart, [currentNote, "0:" + noteLength + ":0"]];
    }
    return [noteSequence, beatCount];
}

/**
 * Takes a list of Cell Values and plays a Tone sequence
 * @param values List of notes as strings e.g. ['A4','A5']
 * @param speedFactor Multipication factor for playback speed
 */
function playSequence(values: string[], speedFactor: number =1, repeats: number =0): void {
    var [noteTimes, beatsLength]: [[string, [string, string]][],number] = createNoteTimes(values);
    var beatsLengthTransport: string = "0:" + beatsLength + ":0";
    
    var polySynth = new Tone.PolySynth(4, Tone.Synth, {
        "volume" : -8,
        "oscillator" : {
            "partials" : [1, 2, 1],
        },
        "portamento" : 0.05
    }).toMaster();

    var synthPart = new Tone.Part(function(time, note){
        piano.triggerAttackRelease(note[0], note[1], time);
    }, noteTimes).start();

    if (repeats>0){
        synthPart = synthPart.stop("0:" + (repeats*beatsLength) + ":0");
    }

    synthPart.loop = true;
    synthPart.loopEnd = beatsLengthTransport;
    synthPart.humanize = false;
    synthPart.playbackRate = speedFactor;
}

/**
 * Gives the index of the column of given letters
 * @param letters column e.g. AB
 * @return index of this column
 */
function lettersToNumber(letters: string): number {
    var num: number = 0;
    const len: number = letters.length;
    letters = letters.toUpperCase();
    for (var i = 0; i < len; i++) {
        num += (letters.charCodeAt(i) - 64) * Math.pow(26, len - i - 1);
    }
    return num;
}

/**
 * Gives the index coordinates of a cell using Excel coordinates
 * @param letters cell position e.g. B1
 * @return coordinates with 0 indexing
 */
function getCellCoords(battleship: string): [number, number] {
    var x = battleship.match(/[a-zA-Z]+|[0-9]+/g);
    return [lettersToNumber(x[0]) - 1, +x[1] - 1];
}

/**
 * INCOMPLETE, takes a start and end cell and gives addresses of cells between (currently only does a column)
 * @param range e.g. B1:B10
 * @return list of addresses in range (inclusive)
 */
function expandRange(range: string): string[] {
    var [start, end] = range.split(":");
    var startCoords = getCellCoords(start);
    var endCoords = getCellCoords(end);
    var colChange = endCoords[0] - startCoords[0];
    var rowChange = endCoords[1] - startCoords[1];
    var startSplit = start.match(/[a-z]+|[^a-z]+/gi);
    var endSplit = end.match(/[a-z]+|[^a-z]+/gi);
    if (rowChange!=0) {
        var col: string = startSplit[0];
        var cells: string[] = []
        for (var i = Math.min(+startSplit[1], +endSplit[1]); i <= Math.max(+startSplit[1], +endSplit[1]); i++) {
            cells.push(col + i);
        }
    }
    return cells;
}

/**
 * If a string is defining a change or direction for a turtle
 * @param s a string
 * @return if it is a turtle direction change definition
 */
function isDirChange(s: string): boolean {
    return RegExp(/^(r|l|n|e|s|w)$/).test(s);
}

/**
 * Next direction of a turtle given current direction and instruction
 * @param current current compass direction being faced
 * @param move next way to turn/look
 * @return direction facing after following instruction
 */
function dirChange(current: string, move: string): string {
    if (RegExp(/^(n|e|s|w)$/).test(move)) {
        return move;
    }
    else {
        // TODO: Check that the moves defined are legal
        if (move == 'r') {
            switch (current) {
                case 'n': return 'e';
                case 'e': return 's';
                case 's': return 'w';
                case 'w': return 'n';
            }
        }
        else {
            // move is l TODO: assert / make sure
            switch (current) {
                case 'n': return 'w';
                case 'e': return 'n';
                case 's': return 'e';
                case 'w': return 's';
            }
        }
    }    
}

/**
 * Given current coordinates and direction, return coordinates after step forwards
 * @param current current coordinates
 * @param dir compass direction turtle is facing
 * @return new coordinates of turtle
 */
function move(current: [number, number], dir: string): [number, number] {
    switch (dir) {
        case 'n': return [Math.max(current[0]-1,0), current[1]];
        case 'e': return [current[0], current[1]+1];
        case 's': return [current[0]+1, current[1]];
        case 'w': return [current[0], Math.max(current[1]-1,0)];
    } 
}

/**
 * Given current coordinates and direction, return coordinates after step forwards
 * @param current current coordinates
 * @param dir compass direction turtle is facing
 * @return new coordinates of turtle
 */
function getTurtleSequence(start: string, moves: string[], sheetVals: any[][]): string[] {

    var startCoords: [number, number] = getCellCoords(start);

    var notes: string[] = [sheetVals[startCoords[1]][startCoords[0]]];

    var dir: string = 'n';
    var pos: [number, number] = [startCoords[1],startCoords[0]];

    for (let entry of moves) {
        if (isDirChange(entry)) {
            dir = dirChange(dir, entry);
        }
        else {
            var steps = entry.substring(1);
            var steps_int = +steps;
            var i
            for (i = 0; i < steps_int; i++) {
                pos = move(pos, dir);
                var sheetVal = sheetVals[pos[0]][pos[1]];
                if (sheetVal == "") {
                    sheetVal = null;
                }
                notes.push(sheetVal);
            }
        }

    }
    return notes;
}

/**
 * Runs a turtle that plays the notes in the cells it passes through
 * @param instructions Instructions as defined by the user in the cell: !turtle(<instrutions>)
 * @param sheetVals The values in the used spreadsheet range
 */
function turtle(instructions: string, sheetVals: any[][]): void {

    var instructionsArray: string[] = instructions.split(',');

    if (isCell(instructionsArray[0])) {
        var notes: string[];
        if (isCell(instructionsArray[1])){
            // TODO: Better regex
            var rangeStart = getCellCoords(instructionsArray[0]);
            var rangeEnd = getCellCoords(instructionsArray[1]);
            notes = [].concat.apply([], sheetVals.slice(rangeStart[1], rangeEnd[1]+1).map(function(arr) { 
                return arr.slice(rangeStart[0], rangeEnd[0]+1); 
            }));
        }
        else{
            var start: string = instructionsArray[0];
            var moves: string[] = instructionsArray[1].split(" ");
            notes = getTurtleSequence(start, moves, sheetVals);
        }
        var speedFactor: number = 1;
        var repeats: number = 0;
        if (instructionsArray.length > 2){
            speedFactor = +instructionsArray[2].replace(/\s/g, "");
            if (instructionsArray.length > 3){
                repeats = +instructionsArray[3].replace(/\s/g, "");
            }
        }
        playSequence(notes, speedFactor, repeats);
    }
    else {
        var turtlesStarts = expandRange(instructionsArray[0].replace(/\s/g, "")); // list of starting notes
        var moves: string[] = instructionsArray[1].trim().split(" ");
        if (instructionsArray.length > 2){
            speedFactor = +instructionsArray[2].replace(/\s/g, "");
            if (instructionsArray.length > 3){
                repeats = +instructionsArray[3].replace(/\s/g, "");
            }
        }
        for (let turtleStart of turtlesStarts){
            playSequence(getTurtleSequence(turtleStart, moves, sheetVals), speedFactor, repeats);
        }
    }
    
    
}

/**
 * Finds all turtle declarations in the spreadsheet and runs them
 * @param sheetVals values in the spreadsheet
 */
function runTurtles(sheetVals: any[][]): void {
    var rows: number = sheetVals.length;
    var cols: number = sheetVals[0].length;

    var row: number, col: number;
    for (row = 0; row < rows; row++) {
        for (col = 0; col < cols; col++) {
            var value = sheetVals[row][col];
            if (isTurtle(value)) {
                var  instructions = value.substring(8, value.length - 1);
                turtle(instructions, sheetVals);
            }
        }
    }
}

/** Default helper for invoking an action and handling errors. */
async function tryCatch(callback) {
    try {
        await callback();
    }
    catch (error) {
        OfficeHelpers.UI.notify(error);
        OfficeHelpers.Utilities.log(error);
    }
}
