Audio assets (supplied)
=======================

UI samples + music bed, loaded by src/sound.ts on first user gesture.

  click.wav       MAIN CLICK   → 'click' (+ 'select' at lower gain)
  transition.mp3  SCREENSWITCH → 'transition' (view switches)
  ffft.mp3        FFFT         → 'hover' (soft), 'tab', 'open', 'back'
  ambient.mp3     Familiar Patterns → the global music bed (loops, swells in over ~6s)

To swap any sound, replace the file here (keep the name). To remap which voice uses
which sample, edit VOICE_MAP in src/sound.ts. If a file is missing, that voice falls
back to the procedural synth.

Note: ambient.mp3 ("Familiar Patterns") and the other clips are licensed assets supplied
by the project owner. If this repo is ever made public, review redistribution rights or
keep /public/audio/ out of the published bundle.
