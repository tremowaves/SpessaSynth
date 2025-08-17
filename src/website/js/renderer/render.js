import { FONT_SIZE, rendererModes } from "./renderer.js";
import { drawNotes } from "./draw_notes.js";

let hasRenderedNoVoices = false;

/**
 * Renders a single frame
 * @this {Renderer}
 * @param auto {boolean} if set to false, the renderer won't clear the screen or request an animation frame. Defaults to true.
 * @param force {boolean} ignores nothing to do
 */
export function render(auto = true, force = false)
{
    let nothingToDo =
        (this.seq === undefined || this?.seq?.paused === true)
        && this.synth.voicesAmount === 0
        && this.rendererMode === rendererModes.waveformsMode
        && !force;
    let forceStraight = false;
    if (!this.renderBool || nothingToDo)
    {
        if (hasRenderedNoVoices)
        {
            // No frames shall be drawn. Redo!
            if (auto)
            {
                requestAnimationFrame(this.render.bind(this));
            }
            return;
        }
        else
        {
            hasRenderedNoVoices = true;
            forceStraight = true;
        }
    }
    else
    {
        hasRenderedNoVoices = false;
    }
    
    if (auto)
    {
        requestAnimationFrame(this.render.bind(this));
        this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    if (this.renderAnalysers && !this.synth.highPerformanceMode)
    {
        // draw the individual analyzers
        this.renderWaveforms(forceStraight);
    }
    
    if (this.renderNotes && this.noteTimes)
    {
        /**
         * Compute positions
         * @type {NoteToRender[]}
         */
        let notesToDraw = this.computeNotePositions(this.synth.highPerformanceMode);
        
        // draw the notes from longest to shortest (non-black midi mode)
        if (!this.synth.highPerformanceMode)
        {
            drawNotes(notesToDraw, this.drawingContext, this.sideways);
        }
    }
    
    // calculate fps
    let timeSinceLastFrame = performance.now() - this.frameTimeStart;
    this.frameTimeStart = performance.now();
    let fps = 1000 / timeSinceLastFrame;
    
    // draw note count and fps
    this.drawingContext.textBaseline = "hanging";
    this.drawingContext.textAlign = "end";
    this.drawingContext.font = `${FONT_SIZE}px monospace`;
    this.drawingContext.fillStyle = "white";
    this.drawingContext.strokeStyle = "white";
    this.drawingContext.fillText(Math.round(fps).toString() + " FPS", this.canvas.width, FONT_SIZE * 2 + 5);
    this.drawingContext.fillText(this.version, this.canvas.width, 5);
    this.drawingContext.fillText(`${this.notesOnScreen} notes`, this.canvas.width, FONT_SIZE + 5);
    
    // draw time signature and tempo (if note times are available)
    if (this.noteTimes)
    {
        this.drawingContext.textAlign = "start";
        this.drawingContext.fillText(
            Math.round(this.seq.currentTempo * this.seq.playbackRate * 100) / 100 + "BPM",
            0,
            5
        );
        this.drawingContext.fillText(this.currentTimeSignature, 0, FONT_SIZE + 5);
    }
    
    // show the hold pedal message
    if (this.showHoldPedal)
    {
        this.drawingContext.font = `${FONT_SIZE * 3}px monospace`;
        this.drawingContext.textAlign = "center";
        this.drawingContext.fillText(this.holdPedalIsDownText, this.canvas.width / 2, this.canvas.height / 4);
    }
    
    
    if (this.onRender)
    {
        this.onRender();
    }
}
