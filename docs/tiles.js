
function getPlacement(canvas, rows, columns) {
    let halfX, halfY, tileSize;
    if (rows === columns) {
        tileSize = (canvas.width / (rows * 2.1));
        halfX = (tileSize * rows) / 2;
        halfY = (tileSize * columns) / 2;
    } else {
        let m = Math.min(rows, columns);
        let M = Math.max(rows, columns);
        let diff = M - m;
        tileSize = (canvas.width / (M * 2.1));
        let addition = diff * (tileSize / 2);
        let op = (rows > columns) ? -1 : 1;
        //todo
        halfX = (tileSize * M) / 2;
        halfY = (tileSize * M) / 2;
    }
    return [tileSize, halfX, halfY]
}

class Tiles {
    constructor(mainCanvas,svg,rows,columns){
        this.mainCanvas = mainCanvas;
        this.svg = svg;
        let [tileSize,halfX,halfY] = getPlacement(mainCanvas,rows,columns);
        this.tileSize = tileSize;
        this.halfX = halfX;
        this.halfY = halfY;
        let defTop = this.svg.find(elem => elem.id === "default");
        for (let gr of this.svg){
            if (gr !== defTop){
                gr.setChildReference(defTop);
            }
        }
        console.log(tileSize,halfX,halfY);
    }

    draw(tile){
        if (tile.type != "blank"){
            let ctx = this.mainCanvas.getContext("2d");
            let dimX = tile.row * this.tileSize - this.halfX;
            let dimY = tile.column * this.tileSize - this.halfY;
            let sides = this.svg.find(elem => elem.id === "sides");
            let defTop = this.svg.find(elem => elem.id === "default");

            if (sides && defTop){
                this.drawElement(ctx,defTop,dimX,dimY);
                sides.draw(ctx);
                if (tile.type !== "default"){
                    let top = this.svg.find(elem => elem.id === tile.type);
                    top.draw(ctx);
                }
            }
        }
    }

    drawElement(ctx,element,dimX,dimY){
        element.x = dimX;
        element.y = dimY;
        element.width = this.tileSize;
        element.height = this.tileSize;
        element.draw(ctx);

    }
}
