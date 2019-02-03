import * as OfficeHelpers from '@microsoft/office-js-helpers';
import * as Tone from 'tone';
import {Chord, Note} from 'tonal';
import {isNote, isTurtle, isCell, isMultiNote, isDirChange, isDynamic} from '../src/regex';
import {insertChord, addChordOctave} from '../src/chords';
import {numberToLetter, lettersToNumber, getCellCoords, dynamicToVolume} from '../src/conversions';

$("#run").hide();
$("#run").show(); // may want to use this to let sounds load first

$("#refresh").click(() => tryCatch(refresh));
$("#run").click(() => tryCatch(run));
$("#stop").click(() => tryCatch(stop));
$("#test").click(() => tryCatch(test));
$("#toggle").click(() => tryCatch(toggle));
$("#insertChord").click(() => tryCatch(insertChord));

var piano: Tone.Sampler;

/**
 * Run when play button pressed. Starts playback of music
 */
async function run() {
    await Excel.run(async (context) => {

        document.getElementById("run").style.background='#A8FFD0';

        const selectedRange = context.workbook.getSelectedRange();
        selectedRange.load("values");

        var sheetSelectHTMLElement = (document.getElementById("sheet_select")) as HTMLSelectElement;
        var sheetChoice = sheetSelectHTMLElement.options[sheetSelectHTMLElement.selectedIndex].value;
        const sheet: Excel.Range = context.workbook.worksheets.getItem(sheetChoice).getUsedRange();
        sheet.load('values');

        await context.sync();

        highlightSheet(sheet);

        Tone.context.close();
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

        // runTurtles(sheet.values);
        // Tone.Transport.start("+0.2");
        
        /// console.log(`The range values "${selectedRange.values}".`);
    });
}

/**
 * Stops music playback
 */
async function stop() {
    await Excel.run(async (context) => {
        document.getElementById("run").style.removeProperty("background-color");
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

        var seq = new Tone.Sequence(function(time, note){
            //play the note
        }, ["C3", [null, "Eb3"], ["F4", "Bb4", "C5"]], "4n");

        console.log(seq);

        //Tone.Transport.start("+0.1");
    });
}

/**
 * refreshes sheets in the dropdown based on sheets that are in workbook
 */
async function refresh() {
    await Excel.run(async (context) => {
        var sheets = context.workbook.worksheets;
        // var sheet = context.workbook.worksheets.getActiveWorksheet();
        sheets.load("items/name");
        // sheet.load("name");
        await context.sync();
        $("#sheet_select").empty()
        for (var i in sheets.items) {
            var name = sheets.items[i].name
            $('#sheet_select').append($('<option>', {
                value: name,
                text: name
            }));
        }
    });
}

/**
 * If a turtle cell is selected, it will toggle the activation of the cell
 */
async function toggle() {
    await Excel.run(async (context) => {
        const selectedRange = context.workbook.getSelectedRange();
        selectedRange.load("values");
        selectedRange.load("address");
        await context.sync();
        var newValues = selectedRange.values;
        // add/remove ! as required
        for (var row=0; row<newValues.length; row++) {
            for (var col=0; col<newValues[0].length; col++) {
                var val = newValues[row][col]
                if (isTurtle(val)) {
                    newValues[row][col] = val.substring(1);
                }
                else if (isTurtle("!" + val)) {
                    newValues[row][col] = "!" + val;
                }
            }
        }
        // propogate changes to grid
        const selectedSheet = context.workbook.worksheets.getActiveWorksheet();
        selectedSheet.getRange(selectedRange.address.split('!')[1]).values = newValues;
    });
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
            var value = sheetVals[row][col];
            // Highlight notes red
            if (isNote(value) || isMultiNote(value)) {
                sheet.getCell(row,col).format.fill.color = "#FFada5";
            }
            // Highlight sustains a lighter red
            else if (value == "s" || value == "-"){
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
 * Assuming a string isNote, returns the number note, octave and volume
 * @param cellValue the string written in the cell that isNote
 * @param currentOct the current octave at that point in the createNoteTimes process
 * @return [note, octave, volume]
 */
function getNoteOctVol(cellValue: string, currentOct: number): [string, number, number] {
    var note: string;
    var octave: number;
    var volume: number = null;

    var cellNoteVol = cellValue.split(' ');

    if (cellNoteVol.length == 2) {
        var cellVol = cellNoteVol[1];
        // process dynamic
        if (isDynamic(cellVol)) {
            volume = dynamicToVolume(cellVol);
        }
        else {
            volume = +cellVol;
        }
    }

    // get note (with octave)
    // octave defined in cell
    var cellNote = cellNoteVol[0];
    if (!isNaN(+cellNote[cellNote.length -1])) {
        octave = +cellNote[cellNote.length -1];
        note = cellNote;
    }
    // octave not defined in cell
    else {
        note = cellNote + currentOct;
        octave = currentOct;
    }
    return [note, octave, volume];
}

/**
 * Assuming a string isMultiNote, returns the number of notes
 * @param s a string
 * @return number of notes in multiNote
 */
function countMultiNote(s: string): number {
    return s.replace(/ /g,'').split(',').filter(function(x){return isNote(x)}).length;
}

/**
 * Takes a list of cell values and creates a list of time and note pairs for Tone Part playback
 * @param values List of notes as strings e.g. ['A4','A5']
 * @param speedFactor Multipication factor for playback speed
 * @return If val is a definition of a note
 */
function createNoteTimes(values: [string, number][]): [[string, [string, string, number]][],number] {
    var len = values.length;
    // find how many notes are defined
    var notesCount = 0;
    for(let valVol of values){
        value = valVol[0];
        if(isNote(value)){
            notesCount++;
        }
        if(isMultiNote(value)){
            notesCount = notesCount + countMultiNote(value);
        }
    }
    var noteSequence: [string, [string, string, number]][] = new Array(notesCount);

    var beatCount = 0; // how many cells through
    var noteCount = 0; // how many notes through
    var noteLength = 0; // for keeping track of note sustain
    var inRest = true // if the current value in the trace is a rest (else we're in a note)
    var currentStart: string; // start time of note currently in
    var currentNote: string; // note currently being played
    // var currentVolume: number = values[0][1];
    var currentVolume: number = dynamicToVolume('mf');
    var volume: number;
    var value: string;
    var octave: number = 4;

    for (let valVol of values) {
        //volume = valVol[1];
        value = valVol[0];

        if(isNote(value)){

            var noteOctVol = getNoteOctVol(value, octave);
            value = noteOctVol[0];
            octave = noteOctVol[1];
            if (noteOctVol[2] != null) {
                volume = noteOctVol[2];
            }
            else {
                volume = currentVolume;
            }

            if(inRest){
                // Rest -> Note
                inRest = false;
            }
            else{
                // Note -> Note
                // end current note
                noteSequence[noteCount++] = [currentStart, [currentNote, "0:" + noteLength + ":0", currentVolume]];
            }
            currentStart = "0:" + beatCount + ":0"; // start new note
            currentNote = value;
            noteLength = 1;
            currentVolume = volume;
        }
        else if(value == null){ //rest
            if(!inRest){
                // Note -> Rest
                // end current note
                noteSequence[noteCount++] = [currentStart, [currentNote, "0:" + noteLength + ":0", currentVolume]];
                inRest = true;
                currentVolume = volume;
            }
        }
        else if(value == 's' || value == '-'){
            // x -> x
            noteLength++;
            currentVolume = volume;
        }
        else if(isMultiNote(value)){
            var noteList = value.split(',').map(x => x.trim());
            var subdivisionLength = 1/(value.replace(/ /g,'').split(',').length);

            var subdivisionCount = 0;
            
            //now process all the scenarios of things than could be in the multinote
            for (let multiVal of noteList) {

                if(isNote(multiVal)){

                    var multiNoteOctVol = getNoteOctVol(multiVal, octave);
                    multiVal = multiNoteOctVol[0];
                    octave = multiNoteOctVol[1];
                    if (multiNoteOctVol[2] != null) {
                        volume = multiNoteOctVol[2];
                    }
                    else {
                        volume = currentVolume;
                    }

                    if(inRest){
                        // Rest -> Note
                        inRest = false;
                    }
                    else{
                        // Note -> Note
                        // end current note
                        noteSequence[noteCount++] = [currentStart, [currentNote, "0:" + noteLength + ":0", currentVolume]];
                    }
                    currentStart = "0:" + (beatCount+subdivisionCount*subdivisionLength) + ":0"; // start new note
                    currentNote = multiVal;
                    noteLength = subdivisionLength;
                }
                else if(multiVal == null){ //rest
                    if(!inRest){
                        // Note -> Rest
                        // end current note
                        noteSequence[noteCount++] = [currentStart, [currentNote, "0:" + noteLength + ":0", currentVolume]];
                        inRest = true;
                    }
                }
                else if(multiVal == 's' || multiVal == '-'){
                    // x -> x
                    noteLength += subdivisionLength;
                }
                currentVolume = volume;
                subdivisionCount++;
            }
        }
        beatCount++
    }
    // add note if we finished in a note
    if(!inRest){
        noteSequence[noteCount++] = [currentStart, [currentNote, "0:" + noteLength + ":0", currentVolume]];
    }
    return [noteSequence, beatCount];
}

/**
 * Takes a list of Cell Values and plays a Tone sequence
 * @param values List of notes as strings e.g. ['A4','A5']
 * @param speedFactor Multipication factor for playback speed
 */
function playSequence(values: [string, number][], speedFactor: number =1, repeats: number =0): void {
    var [noteTimes, beatsLength]: [[string, [string, string, number]][],number] = createNoteTimes(values);
    
    var polySynth = new Tone.PolySynth(4, Tone.Synth, {
        "volume" : -4,
        "oscillator" : {
            "partials" : [1, 2, 1],
        },
        "portamento" : 0.05
    }).toMaster();

    console.log(noteTimes);

    var synthPart = new Tone.Part(function(time: string, note: [string, string, number]){
        piano.triggerAttackRelease(note[0], note[1], time, note[2]);
    }, noteTimes).start();

    if (repeats>0){
        synthPart = synthPart.stop("0:" + (repeats*beatsLength/speedFactor) + ":0");
    }

    synthPart.loop = true;
    synthPart.loopEnd = "0:" + beatsLength + ":0";
    synthPart.humanize = false;
    synthPart.playbackRate = speedFactor;
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
 * Next direction of a turtle given current direction and instruction
 * @param current current compass direction being faced
 * @param move next way to turn/look
 * @return direction facing after following instruction
 */
function dirChange(current: string, move: string): string {
    current = current.toLowerCase();
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
function getTurtleSequence(start: string, moves: string[], sheetVals: any[][]): [string, number][] {

    var startCoords: [number, number] = getCellCoords(start);
    var volume: number = dynamicToVolume('mf');

    var sheetValsRows = sheetVals.length;
    var sheetValsCols = sheetVals[0].length;

    if (isDynamic(moves[0])) {
        volume = dynamicToVolume(moves[0]);
    }

    // notes are stored in the format [note, volume] at this stage
    var notes: [string, number][] = [[sheetVals[startCoords[1]][startCoords[0]], volume]];

    var dir: string = 'n';
    var pos: [number, number] = [startCoords[1],startCoords[0]];

    for (let entry of moves) {
        if (isDirChange(entry)) {
            dir = dirChange(dir, entry);
        }
        else if (entry.substring(0,1) == 'j' || entry.substring(0,1) == 'J') {
            // Jump
            var jumpInstructions = entry.substring(1);
            if (isCell(jumpInstructions)) {
                var newCoords = getCellCoords(jumpInstructions);
                pos = [newCoords[1], newCoords[0]];
            }
            else {
                // relative Jump
                var regex = /(\+|-)[0-9]+/g;
                var movements = jumpInstructions.match(regex).map(x => +x);
                pos = [pos[0] + movements[1], pos[1] + movements[0]];
            }
            notes.push([sheetVals[pos[0]][pos[1]],volume]);
        }
        else if (isDynamic(entry)) {
            volume = dynamicToVolume(entry);
        }
        else {
            // move
            var steps = entry.substring(1);
            var steps_int = +steps;
            var i
            var sheetVal;
            for (i = 0; i < steps_int; i++) {
                pos = move(pos, dir);
                if (pos[0] >= sheetValsRows || pos[1] >= sheetValsCols) {
                    sheetVal = null;
                }
                else{
                    sheetVal = sheetVals[pos[0]][pos[1]];
                    if (sheetVal == "") {
                        sheetVal = null;
                    }
                }
                notes.push([sheetVal, volume]);
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
        var notes: [string, number][];
        if (isCell(instructionsArray[1])){
            // TODO: Better regex
            var rangeStart = getCellCoords(instructionsArray[0]);
            var rangeEnd = getCellCoords(instructionsArray[1]);
            notes = [].concat.apply([], sheetVals.slice(rangeStart[1], rangeEnd[1]+1).map(function(arr) { 
                return arr.slice(rangeStart[0], rangeEnd[0]+1).map(function(x) {
                    return [x,dynamicToVolume('mf')];
                });
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
            speedFactor = eval(instructionsArray[2]);
            if (instructionsArray.length > 3){
                repeats = +instructionsArray[3].replace(/\s/g, "");
            }
        }
        // console.log(notes);
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
export async function tryCatch(callback) {
    try {
        await callback();
    }
    catch (error) {
        OfficeHelpers.UI.notify(error);
        OfficeHelpers.Utilities.log(error);
    }
}