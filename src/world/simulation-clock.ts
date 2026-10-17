export type SimulationAdvance={steps:number;alpha:number;droppedSeconds:number}
/** Bounded fixed-step accumulator; renderer FPS cannot cause unbounded simulation catch-up. */
export class FixedStepClock{
 private accumulator=0;private dropped=0
 constructor(readonly stepSeconds=1/60,readonly maxFrameSeconds=.1,readonly maxStepsPerAdvance=5){
  if(!Number.isFinite(stepSeconds)||stepSeconds<=0)throw Error('stepSeconds must be positive')
  if(!Number.isFinite(maxFrameSeconds)||maxFrameSeconds<stepSeconds)throw Error('maxFrameSeconds must be at least one step')
  if(!Number.isInteger(maxStepsPerAdvance)||maxStepsPerAdvance<1)throw Error('maxStepsPerAdvance must be positive')
 }
 advance(frameSeconds:number,tick:(dt:number)=>void):SimulationAdvance{
  if(!Number.isFinite(frameSeconds)||frameSeconds<0)throw Error('frameSeconds must be non-negative')
  const accepted=Math.min(frameSeconds,this.maxFrameSeconds);this.dropped+=frameSeconds-accepted;this.accumulator+=accepted
  let steps=0;while(this.accumulator>=this.stepSeconds&&steps<this.maxStepsPerAdvance){tick(this.stepSeconds);this.accumulator-=this.stepSeconds;steps++}
  if(this.accumulator>=this.stepSeconds){const remainder=this.accumulator%this.stepSeconds;this.dropped+=this.accumulator-remainder;this.accumulator=remainder}
  return {steps,alpha:this.accumulator/this.stepSeconds,droppedSeconds:this.dropped}
 }
 reset(){this.accumulator=0;this.dropped=0}
 get droppedSeconds(){return this.dropped}
}