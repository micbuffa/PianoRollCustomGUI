// class to describe a cell with row, col, color
class PianoRollCustomGUICell {
    constructor(col, row, color) {
        this.col = col;
        this.row = row;
        this.color = color;
        this.active = false;
    }
}

class PianoRollCustomGUI {
    constructor(nbrows, nbBars, timeSigNumerator, timeSigDenominator, currentBpm) {
        this.cells = [];
        // number of rows and columns depending on the number of bars and time signature
        // number of columns is nbBars * timeSigNumerator * timeSigDenominator
        this.cols = nbBars * timeSigNumerator * timeSigDenominator;
        this.rows = nbrows //  rows for the piano roll
        this.w = width / this.cols;
        this.h = height / this.rows;
        this.createCells();
        this.playheadPosition = 100;
        this.playheadColor = color(0, 255, 0);
        this.nbBars = nbBars;
        this.timeSignatureDenominator = timeSigDenominator; // 4 subdivisions per bar
        this.timeSignatureNumerator = timeSigNumerator; // 4 beats per bar
        this.tempo = currentBpm; // in BPM
        // the GUI displays nb bars of timeSignatureNumerator beats
        // each beat is made of timeSignatureDenominator subdivisions
        // ONE CELL IS ONE SUBDIVISION !
        // NUMBER OF SUBDIVISIONS PER BEAT = timeSignatureDenominator
        // NUMBER OF BEATS IN ONE BAR = timeSignatureNumerator
        // NUMBER OF SUBDIVISIONS IN ONE BAR = timeSignatureDenominator * timeSignatureNumerator
        // time to play one beat is 60 / tempo = 1s if the tempo is 60 BPM
        // so the playhead moves 1 beat every second at 60 BPM
        // it moves 4 cells (subdivisions) every second at 60 BPM if the time signature is 4/4
        // the speed in pixels per second is the number of cells in one bar
        // divided by the time in seconds to play one bar
        //this.timePerSecondToPlayOneBar = (this.timeSignatureDenominator * this.nbBars) / this.tempo; // in seconds
       // console.log(this.timePerSecondToPlayOneBar);
        // beat subdivision (one cell) duration in seconds
        this.oneBeatDuration = 60 / this.tempo; // in seconds
        this.beatSubdivisionDuration = this.oneBeatDuration / this.timeSignatureDenominator; // in milliseconds
        console.log("Durée d'une cellule = " + this.beatSubdivisionDuration);
        this.started = false;
    }

    createCells() {
        // create the cells, taking into account the number rows and cols
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = new PianoRollCustomGUICell(col, row, color(255));
                this.cells.push(cell);
            }
        }
    }
    updateCell(col, row, color) {
        const cell = this.cells.find(c => c.col === col && c.row === row);
        if (cell) {
            cell.color = color;
        }
    }
    draw() {
        // Draw the cells
        for (let i = 0; i < this.cells.length; i++) {
            const cell = this.cells[i];
            fill(cell.color);
            stroke(0);
            rect(cell.col * this.w, cell.row * this.h, this.w, this.h);
        }

        // draw thick lines every beat
        push();
        stroke(0);
        strokeWeight(4);
        // draw a line every timeSignatureDenominator cells
        for (let i = 0; i < this.cols; i += this.timeSignatureDenominator) {
            line(i * this.w, 0, i * this.w, height);
        }
        pop();

        // draw super thick lines every bar
        push();
        stroke(color(0, 0, 255));
        strokeWeight(8);
        for (let i = 0; i < this.cols; i += this.timeSignatureDenominator * this.timeSignatureNumerator) {
            line(i * this.w, 0, i * this.w, height);
        }
        pop();

        if (this.started) {            
            // compute playhead position depending on the time elapsed since start (in milliseconds)
            //console.log(this.timeElaspedSinceStart);
            this.playheadPosition = (this.timeElaspedSinceStart / this.beatSubdivisionDuration) % this.cols;
            
            // Draw the playhead
            this.drawPlayhead();

            // time elapsed since start in milliseconds with high accuracy. We could have used the 
            // deltaTime global variable from p5js (also available in BabylonJS) to compute
            // the elasped time with summing the deltas, but I prefer to use audioContext.currentTime
            // so elapsed time = currentTime - startTime, as we're web audio based, and the pianoRoll WAM
            // uses this has its main clock
            //this.timeElaspedSinceStart += deltaTime;
            // currentTime is in SECONDS !
            this.timeElaspedSinceStart = (audioContext.currentTime) - this.startTime;
            //console.log(this.timeElaspedSinceStart + " " + this.timeElaspedSinceStart);
        }
    }

    // Draw the playhead
    drawPlayhead() {
        fill(this.playheadColor);
        stroke(0);
        rect(this.playheadPosition * this.w, 0, this.w / 10, height);
        // Get column number from the playhead position
        const col = Math.floor(this.playheadPosition);
        // check if there are any cell activated in this column, and change its color to green
        for (let i = 0; i < this.rows; i++) {
            const cell = this.getCell(col, i);
            if (this.isCellActive(cell)) {
                console.log("cell active");
                // Make it flash green for a short time and go back to red
                cell.color = color(0, 255, 0);

                setTimeout(() => {
                    cell.color = color(255, 0, 0);
                }, this.beatSubdivisionDuration*1000);
            }

        }
    }

    setTempo(tempo) {
        this.tempo = tempo;
        // adjust the speed of the playhead
        this.playHeadSpeedIncrement = (this.cols / this.nbBars * this.timeSignatureNumerator) / ((60 / this.tempo) * 1000); // in cells per second
        // adjust the duration of one cell
        this.beatSubdivisionDuration = this.oneBeatDuration / this.timeSignatureDenominator; // in milliseconds
        //console.log("Durée d'une cellule = " + this.beatSubdivisionDuration);
    }

    start() {
        this.started = true;
        this.playheadPosition = 0;
        this.timeElaspedSinceStart = 0;
        this.startTime = audioContext.currentTime; // in seconds (float)
        //console.log(this.timeElaspedSinceStart);
    }

    stop() {
        this.started = false;
        this.playheadPosition = 0;
    }

    clear() {
        this.cells.forEach(cell => {
            cell.color = color(255);
        });
    }
    getCell(col, row) {
        // returns the cell at the given column and row, taking into account the number of rows and columns
        return this.cells.find(cell => cell.col === col && cell.row === row);
    }
    getCellIndex(col, row) {
        return this.cells.findIndex(cell => cell.col === col && cell.row === row);
    }
    getCellColor(col, row) {
        const cell = this.getCell(col, row);
        return cell ? cell.color : null;
    }
    setCellColor(col, row, color) {
        const cell = this.getCell(col, row);
        if (cell) {
            cell.color = color;
        }
    }

    setCellActive(col, row) {
        const cell = this.getCell(col, row);
        if (cell) {
            cell.color = color(255, 0, 0);
            cell.active = true;
        }
    }

    setCellInactive(col, row) {
        const cell = this.getCell(col, row);
        if (cell) {
            cell.color = color(255);
            cell.active = false;
        }
    }

    toggleCellActive(cell) {
        if(!cell) return;

        if (cell.active) {
            this.setCellInactive(cell.col, cell.row);
        } else {
            this.setCellActive(cell.col, cell.row);
        }
    }

    toggleCellColor(col, row) {
        const cell = this.getCell(col, row);
        if (cell) {
            console.log(cell.color)
            cell.color = (cell.color.levels[2] === 255) ? color(255, 0, 0) : color(255);
        }
    }

    isCellActive(cell) {
        // returns true if the cell is red
        return cell.active
    }

    isCellEmpty(cell) {
        return !cell.active;
    }


    getCellPosition(col, row) {
        const cell = this.getCell(col, row);
        return cell ? { x: cell.col * this.w, y: cell.row * this.h } : null;
    }
    getCellSize() {
        return { width: this.w, height: this.h };
    }
    getCellCount() {
        return this.cells.length;
    }
    getRowCount() {
        return this.rows;
    }
    getColCount() {
        return this.cols;
    }
}
