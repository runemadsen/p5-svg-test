var exportSVG = false;

function setup() {
  createCanvas(500, 500);
}

function draw() {

  if(exportSVG) beginRecord();
  
  background(100);
  fill(255, 0, 0);
  ellipse(100, 100, 50, 50);
  fill(0, 255, 0);
  rect(200, 200, 200, 200);
  
  if(exportSVG)
  {
    exportSVG = false;
    endRecord();
  }
}

function keyPressed()
{
  if(key == "S")
  {
    exportSVG = true;
  }
}