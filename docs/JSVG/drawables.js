//import {PathParser} from "./path-parser.js";
/*
* Classes that represents svg elements.
* They define draw methods for canvas rendering via canvas commands.
* Better alternative to converting svg element to image and drawing that image to canvas.
* Class instances are editable and redrawable after the change of properties.
* */


//mapping from svg to canvas command
//key == svg command, value.cmd == canvas command
const commandMapping = {
  "fill": {cmd:"fillStyle"},
  "fill-opacity": {cmd:"globalAlpha",parser: parseFloat},
  "stroke-width":{cmd:"lineWidth",parser: parseFloat},
  "stroke-linejoin":{cmd:"lineJoin"},
  "stroke-linecap":{cmd:"lineCap"},
  "stroke-miterlimit":{cmd:"miterLimit"},
  "stroke":{cmd:"strokeStyle"},
};

const strokeCmds = ["stroke","stroke-width","stroke-linejoin","stroke-linecap","stroke-miterlimit"];

//abstract class
class Drawable{
    constructor(svg){
        this.initialValues = {};
        this.properties = [];
        this._setup(svg);
    }

    _setup(svg){
        this._setVisibility(svg);
        this.transformList = svg.transform.baseVal;
        this.class = this._getClass(svg);
        this.id = this._getId(svg);
    }

    //********************* property getters and setters ************************//
    //add special accessors to instance so original properties do not change
    //call it only once after saving all supported properties to initialValues
    _addAccessors(){
      for (let prop of this.properties){
        Object.defineProperty(this,prop,{
          get(){return this[`_${prop}`] !== undefined ? this[`_${prop}`] : this.initialValues[`${prop}`];},
          set(value){
            this[`_${prop}`] = value;
          }
        })
      }
    }

    restoreState(){
      for (let prop of this.properties){
        this[prop] = undefined;
      }
    }


    //***************** get properties from svg ************************//

    _getAttr(elem,attr){
      try {
        let r =  elem[attr].baseVal.value;
        return r;
      }catch(err){
        return null;
      }
    }

    //find attribute in svg
    _getClass(elem){
      if (elem.hasAttribute("class")){
        return elem.getAttribute("class");
      }else{
        return undefined;
      }
    }
    //find id in svg
    _getId(elem){
      if (elem.hasAttribute("id")){
        return elem.getAttribute("id");
      }else{
        return undefined;
      }
    }

    _setVisibility(svg){
      let visibility = svg.getAttribute("visibility");
      if (visibility === "hidden" || visibility === "collapse"){
        this.initialValues.visible = false;
      } else { //value is neither visible nor null (== visibility not defined)
        this.initialValues.visible = true;
      }
      this.properties.push("visible");
    }

    _handleStyles(elem){
      //get both inline and presentation attributes
      if (elem.getAttribute("style")){
        //inline style attributes
        this._parseStyleAttr(elem.getAttribute("style"));
      }
      //presentation attributes
      this._getPresentStyle(elem);
    }

    _getPresentStyle(elem){
      for (const attr of Object.keys(commandMapping)){
        let value = elem.getAttribute(attr);
        if (value){
          this._mapAttr(attr,value);
        }
      }
    }

    _parseStyleAttr(styleStr){
      let parts = styleStr.split(";");

      for (const attr of parts){
        let name,value;
        [name,value] = attr.split(":");
        if (name){
          name = name.trim();
          if (commandMapping[name]){ //attribute is supported
            this._mapAttr(name,value);
          }
        }
      }
    }

    _mapAttr(attrName,attrValue){
      let mapping = commandMapping[attrName];
      let value = attrValue.trim();
      if (mapping.parser) {
        value = mapping.parser(value);
      }
      this.initialValues[attrName] = value;
      this.properties.push(attrName);
    }

    //********** transformations and computations of reference object ***********//

    //an object which serves as reference in translating and scaling
    //must have several properties: x,y,width,height to perform computations
    setReference(ref){
        this.reference = ref;
    }

    _getReferenceChange(){
        let changeX = (this.reference.x - this.reference.initialValues.x) || 0;
        let changeY = (this.reference.y - this.reference.initialValues.y) || 0;
        let changeW = (this.reference.width/this.reference.initialValues.width) || 1;
        let changeH = (this.reference.height/this.reference.initialValues.height) || 1;
        return [changeX,changeY,changeW,changeH];
    }

    _transform(ctx){
        this._referenceTransform(ctx);
        this._ownTransform(ctx);
    }

    _ownTransform(ctx){
        for (const transf of this.transformList){
            this._applyTransformation(transf,ctx);
        }
    }

    _applyTransformation(transf,ctx){
        let m = transf.matrix;
        switch(transf.type){
            case SVGTransform.SVG_TRANSFORM_TRANSLATE:
                ctx.translate(m.e,m.f);
                break;
            case SVGTransform.SVG_TRANSFORM_SKEWX:
            case SVGTransform.SVG_TRANSFORM_SKEWY:
            case SVGTransform.SVG_TRANSFORM_MATRIX:
            case SVGTransform.SVG_TRANSFORM_ROTATE:
                ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);
                break;
            case SVGTransform.SVG_TRANSFORM_SCALE:
                ctx.scale(m.a,m.d);
                break;
        }
    }

    _referenceTransform(ctx){
        if (this.reference){
            let moveX = (this.reference.x - this.reference.initialValues.x) || 0;
            let moveY = (this.reference.y - this.reference.initialValues.y) || 0;
            let scaleX = (this.reference.width/this.reference.initialValues.width);
            let scaleY = (this.reference.height/this.reference.initialValues.height);

            if (scaleX || scaleY){
                scaleX = scaleX || 1;
                scaleY = scaleY || 1;
                let changeX = scaleX == 1 ? moveX : (- this.reference.initialValues.x * scaleX) + this.reference.x;
                let changeY = scaleY == 1 ? moveY : (- this.reference.initialValues.y * scaleY) + this.reference.y;
                ctx.translate(changeX,changeY);
                ctx.scale(scaleX,scaleY);
            }else if (moveX || moveY){
                ctx.translate(moveX,moveY);
            }
        }
    }

    //******************* setup provided canvas context according to svg properties *********************//
    //drawables use svg props -> map them to canvas props
    _setupContext(ctx, toDraw = null){
        //svg fill attribute can have value none which indicates not to fill area
        if (this.fill !== "none"){
          if (this.fill){
            let oldOpacity = ctx.globalAlpha;
            if (this["fill-opacity"]){
              ctx.globalAlpha = this["fill-opacity"];
            }
            ctx.fillStyle = this.fill;
            toDraw ? ctx.fill(toDraw) : ctx.fill();
            ctx.globalAlpha = oldOpacity; //revert fill-opacity
          } else { //draw shape implicitly (svg fills shape with black if fill not provided)
            ctx.fillStyle = "black";
            toDraw ? ctx.fill(toDraw) : ctx.fill();
          }
        }
        if (this.stroke && (this.stroke !== "none")){
            this._setupStroke(ctx);
            toDraw ?  ctx.stroke(toDraw): ctx.stroke();
        }

    }

    _setupStroke(ctx){
      for (const svgProp of strokeCmds){
        this._setupCtxProperty(ctx,svgProp);
      }
    }

    _setupCtxProperty(ctx,svgProp){
      let strokeMap = commandMapping[svgProp];
      let value = this[svgProp];
      if (value){
        ctx[strokeMap.cmd] = value;
      }
    }

}

//----------------------------------------------------------------------------------

class Group extends Drawable{
    constructor(svg,...children){
        super(svg);
        this.children = children;
        this.forceCascade = false;
        this.initDimensions();
        this._handleStyles(svg);
        this._addAccessors();
        this.setChildReference(this);
    }
    //sets reference object for other children
    setChildReference(refObject, ...childIndexes){
        this.childReference = refObject;
        if (childIndexes.length === 0){  //not specifying indexes means set reference to all children
            for (const child of this.children){
                if (child !== refObject){
                    child.setReference(refObject);
                }
            }
        }else {
            for (const i of childIndexes){
                if (this.children[i] !== refObject){
                    this.children[i].setReference(refObject);
                }
            }
        }
    }

    restoreState(){
        super.restoreState();
        for (const child of this.children){
            child.restoreState();
        }
    }

    _propagateProperties(child){
        for (const p of Object.keys(commandMapping)){
            if (this.properties.includes(p) && this[p]){  //this.hasOwnProperty(property)
              let propertyless = ((!child.hasOwnProperty(p)) || (child[p] == undefined));
              if ( propertyless || this.forceCascade){ //inherit
                child[p] = this[p];
              }
            }
        }
    }

    _getDimensions(){
        let x = this.x;
        let y = this.y;
        let width = this.width;
        let height = this.height;
        return [x,y,width,height];
    }

    initDimensions(){
        let left = this.findPoint((child)=> child.getLeft(),"<");
        let top = this.findPoint((child)=> child.getTop(),"<");
        let right = this.findPoint((child)=> child.getRight(),">");
        let bottom = this.findPoint((child)=> child.getBottom(),">");
        for (const transf of this.transformList){
            let l,t,r,b;
            let m = transf.matrix;
            l = m.a*left + m.c*top + m.e;
            t = m.b*left + m.d*top + m.f;
            r = m.a*right + m.c*bottom + m.e;
            b = m.b*right + m.d*bottom + m.f;
            left = l;
            top = t;
            right = r;
            bottom = b;
        }
        this.initialValues.x = left;
        this.initialValues.y = top;
        this.initialValues.width = right - left;
        this.initialValues.height = bottom  - top;
        this.properties.push("x","y","width","height");
    }

    findPoint(fn,comparator){
        let compare = (a,b) => {return (comparator == "<")? a < b :  a > b;};
        let point = comparator == "<" ? Number.MAX_VALUE : Number.MIN_VALUE;
        for(const child of this.children){
            let m = fn(child);
            if (compare(m,point)){
                point = m;
            }
        }
        return point;
    }

    _setPosition(){
        /*
        if (this.reference){
            this._setPosition();
        }*/
        let d = this._getDimensions();
        let scaleX = this.reference.get("width")/this.reference.width;
        let scaleY = this.reference.get("height")/this.reference.height;
        let newX = (this.x - this.reference.x)*scaleX + this.reference.get("x");
        let newY = (this.y - this.reference.y)*scaleY + this.reference.get("y");
        this.x = newX;
        this.y = newY;
        this.width *= scaleX;
        this.height *= scaleY;
    }

    draw(ctx){
        ctx.save();
        this._transform(ctx);
        for(const child of this.children){
            this._propagateProperties(child);
            child.draw(ctx);
        }
        ctx.restore();
    }

    getLeft(){
        return this.x;
    }

    getTop(){
        return this.y;
    }

    getRight(){
        return this.x + this.width;
    }

    getBottom(){
        return this.y + this.height;
    }

    //get one child with matching id
    find(id){
        for (const child of this.children){
            if (child.id == id){
                return child;
            }
        }
        return null;
    }

    //get all children with className
    findAll(className){
        let found = [];
        for (const child of this.children){
            if (child.class == className){
                found.push(child);
            }
        }
        return found;
    }

}

//-----------------------------------------------------------------------------------

class Rect extends Drawable{
    constructor(svg){
        super(svg);
        this.initialValues.x = this._getAttr(svg,"x") || 0;
        this.initialValues.y = this._getAttr(svg,"y") || 0;
        this.initialValues.width = this._getAttr(svg,"width") || 0;
        this.initialValues.height = this._getAttr(svg,"height") || 0;
        this.properties.push("x","y","width","height");
        this._handleStyles(svg);
        this._addAccessors();
    }

    _getRectArgs(){
        let x = this.x;
        let y = this.y;
        let w = this.width;
        let h = this.height;
        return [x,y,w,h];
    }

    draw(ctx){
        if (this.visible) {
            ctx.save();
            ctx.beginPath();

            this._ownTransform(ctx);
            let dimensions = this._getRectArgs();
            this.refTransform(ctx,dimensions);
            ctx.rect(...dimensions);
            this._setupContext(ctx);

            ctx.closePath();
            ctx.restore();
        }
    }

    refTransform(ctx,dimensions){
        if (this.reference) {
            let scaleX = this.reference.width/this.reference.initialValues.width || 1;
            let scaleY = this.reference.height/this.reference.initialValues.height || 1;
            let newX = (this.initialValues.x - this.reference.initialValues.x)*scaleX + this.reference.x;
            let newY = (this.initialValues.y - this.reference.initialValues.y)*scaleY + this.reference.y;
            dimensions[0] = newX;
            dimensions[1] = newY;
            dimensions[2] *= scaleX;
            dimensions[3] *= scaleY;
        }
    }

    getLeft(){
        return this.x;
    }

    getTop(){
        return this.y;
    }

    getRight(){
        return this.x + this.width;
    }

    getBottom(){
        return this.y + this.height;
    }
}

//----------------------------------------------------------------------------------------------

class Path extends Drawable{
    static pattern = new RegExp("([achlmsqvtz])([^achlmsqvtz]*)");

    constructor(svg){
        super(svg);
        //this.class = this._getClass(svg);
        let pathStr = svg.getAttribute("d");
        let parser = new PathParser();
        this.points = parser.parse(pathStr);
        this.path = new Path2D(pathStr);
        this._handleStyles(svg);
        this._addAccessors();
    }

    draw(ctx){
        if (this.visible) {
            ctx.save();
            ctx.beginPath();

            this._transform(ctx);
            this._setupContext(ctx,this.path);

            ctx.closePath();
            ctx.restore();
        }
    }

    getLeft(){
        if (this.hasOwnProperty("left")){
            return this.left;
        }else{
            let xPoints = this.points.map(point => point.x);
            let left = Math.min(...xPoints);
            this.left = left;
            return left;
        }
    }

    getTop(){
        if (this.hasOwnProperty("top")){
            return this.top;
        }else{
            let yPoints = this.points.map(point => point.y);
            let top = Math.min(...yPoints);
            this.top = top;
            return top;
        }
    }

    getRight(){
        if (this.hasOwnProperty("right")){
            return this.right;
        }else{
            let xPoints = this.points.map(point => point.x);
            let right = Math.max(...xPoints);
            this.right = right;
            return right;
        }
    }

    getBottom(){
        if (this.hasOwnProperty("bottom")){
            return this.bottom;
        }else{
            let yPoints = this.points.map(point => point.y);
            let bottom = Math.max(...yPoints);
            this.bottom = bottom;
            return bottom;
        }
    }
}

//---------------------------------------------------------------------------------------

class Circle extends Drawable{
    constructor(svg){
        super(svg);
        this.initialValues.cx = this._getAttr(svg,"cx") || 0;
        this.initialValues.cy = this._getAttr(svg,"cy") || 0;
        this.initialValues.radius = this._getAttr(svg,"r") || 0;
        this.properties.push("cx","cy","radius");
        this._handleStyles(svg);
        this._addAccessors();
    }

    _getDimensions(){
        let cx =  this.cx;
        let cy = this.cy;
        let r = this.radius;
        return [cx,cy,r];
    }

    draw(ctx){
        if (this.visible) {
            let d = this._getDimensions();
            ctx.save();
            ctx.beginPath();

            this._transform(ctx);
            ctx.arc(d[0], d[1], d[2], 0, 2 * Math.PI);
            this._setupContext(ctx);

            ctx.closePath();
            ctx.restore();
        }
    }

    getLeft(){
        return (this.cx - this.radius);
    }

    getTop(){
        return (this.cy - this.radius);
    }

    getRight(){
        return (this.cx + this.radius);
    }

    getBottom(){
        return (this.cy + this.radius);
    }
}

class Polygon extends Drawable{
    constructor(svg){
        super(svg);
        let points = this._parsePoints(svg.points);
        this.points = svg.points;
        this.path = new Path2D(points);
        this._handleStyles(svg);
        this._addAccessors();
    }

    _parsePoints(pointList){
        let path = "M";
        for (let point of pointList){
            let part = " " + point.x + " " + point.y;
            path += part;
        }
        return path;
    }

    draw(ctx){
        if (this.visible && (this.points.length > 0)){
            ctx.save();
            ctx.beginPath();

            this._transform(ctx);
            this._setupContext(ctx,this.path);

            ctx.closePath();
            ctx.restore();
        }
    }

    getLeft(){
        if (this.hasOwnProperty("left")){
            return this.left;
        }else{
            let left = Number.MAX_VALUE;
            for (const point of this.points){
                if (point.x < left){
                    left = point.x;
                }
            }
            this.left = left;
            return left;
        }
    }

    getTop(){
        if (this.hasOwnProperty("top")){
           return this.top;
        }else{
            let top = Number.MAX_VALUE;
            for (const point of this.points){
                if (point.y < top){
                    top = point.y;
                }
            }
            this.top = top;
            return top;
        }
    }

    getRight(){
        if (this.hasOwnProperty("right")){
            return this.right
        }else{
            let right = Number.MIN_VALUE;
            for(const point of this.points){
                if (point.x > right){
                    right = point.x;
                }
            }
            this.right = right;
            return right;
        }
    }

    getBottom(){
        if (this.hasOwnProperty("bottom")){
            return this.bottom
        }else{
            let bottom = Number.MIN_VALUE;
            for(const point of this.points){
                if (point.y > bottom){
                    bottom = point.y;
                }
            }
            this.bottom = bottom;
            return bottom;
        }
    }
}

class Line extends Drawable{
    constructor(svg){
        super(svg);
        this._setPoints(svg);
        this._handleStyles(svg);
        this._addAccessors();
    }

    _setPoints(svg){
        let x1 = this._getAttr(svg,"x1") || 0;
        let y1 = this._getAttr(svg,"y1") || 0;
        let x2 = this._getAttr(svg,"x2") || 0;
        let y2 = this._getAttr(svg,"y2") || 0;
        this.initialValues.startPoint = {"x":x1,"y":y1};
        this.initialValues.endPoint = {"x":x2,"y":y2};
        this.properties.push("startPoint","endPoint");
        let p = "M ";
        p += [x1,y1,x2,y2].join(" ");
        this.path = new Path2D(p);
    }

    draw(ctx){
        if (this.visible && this.stroke){
            ctx.save();
            ctx.beginPath();

            let start = this.startPoint;
            let end = this.endPoint;
            let p1 = {"x":start.x,"y":start.y}
            let p2 = {"x":end.x,"y":end.y};
            this.refTransform(ctx,p1,p2);
            ctx.moveTo(p1.x,p1.y);
            ctx.lineTo(p2.x,p2.y);
            this._setupContext(ctx);

            ctx.closePath();
            ctx.restore();
        }
    }

    refTransform(ctx,p1,p2){
        if (this.reference){
            let change = this._getReferenceChange();
            p1.x = p1.x * change[2] + change[0];
            p1.y = p1.y * change[3] + change[1];
            p2.x = p2.x * change[2] + change[0];
            p2.y = p2.y * change[3] + change[1];
        }
    }

    getLeft(){
        return Math.min(this.startPoint.x,this.endPoint.x);
    }

    getTop(){
        return Math.min(this.startPoint.y,this.endPoint.y);
    }

    getRight(){
        return Math.max(this.startPoint.x,this.endPoint.x);
    }

    getBottom(){
        return Math.max(this.startPoint.y,this.endPoint.y);
    }
}

class Polyline extends Drawable{
    constructor(svg){
        super(svg);
        this.points = svg.points;
        this.path = new Path2D(this._parsePoints(svg.points));
        this._handleStyles(svg);
        this._addAccessors();
    }

    _parsePoints(pointList){
        let path = "M";
        for (let point of pointList){
            let part = " " + point.x + " " + point.y;
            path += part;
        }
        return path;
    }

    draw(ctx){
        if (this.visible){
            ctx.save();
            ctx.beginPath();

            this._transform(ctx);
            this._setupContext(ctx,this.path);

            ctx.closePath();
            ctx.restore();
        }
    }

    getLeft(){
        if (this.hasOwnProperty("left")){
            return this.left;
        }else{
            let left = Number.MAX_VALUE;
            for (const point of this.points){
                if (point.x < left){
                    left = point.x;
                }
            }
            this.left = left;
            return left;
        }
    }

    getTop(){
        if (this.hasOwnProperty("top")){
            return this.top;
        }else{
            let top = Number.MAX_VALUE;
            for (const point of this.points){
                if (point.y < top){
                    top = point.y;
                }
            }
            this.top = top;
            return top;
        }
    }

    getRight(){
        if (this.hasOwnProperty("right")){
            return this.right
        }else{
            let right = Number.MIN_VALUE;
            for(const point of this.points){
                if (point.x > right){
                    right = point.x;
                }
            }
            this.right = right;
            return right;
        }
    }

    getBottom(){
        if (this.hasOwnProperty("bottom")){
            return this.bottom
        }else{
            let bottom = Number.MIN_VALUE;
            for(const point of this.points){
                if (point.y > bottom){
                    bottom = point.y;
                }
            }
            this.bottom = bottom;
            return bottom;
        }
    }
}

class Ellipse extends Drawable{
    constructor(svg){
        super(svg);
        this.initialValues.cx = this._getAttr(svg,"cx") || 0;
        this.initialValues.cy = this._getAttr(svg,"cy") || 0;
        this.initialValues.rx = this._getAttr(svg,"rx") || 0;
        this.initialValues.ry = this._getAttr(svg,"ry") || 0;
        this._handleStyles(svg);
        this.properties.push("cx","cy","rx","ry");
        this._addAccessors();
    }

    _getDimensions(){
        let cx =  this.cx;
        let cy = this.cy;
        let rx =  this.rx;
        let ry = this.ry;
        return [cx,cy,rx,ry];
    }

    draw(ctx){
        if (this.visible){
            let d = this._getDimensions();
            ctx.save();
            ctx.beginPath();
            this._transform(ctx);
            ctx.ellipse(d[0],d[1],d[2],d[3],0,0,2*Math.PI);
            this._setupContext(ctx);

            ctx.closePath();
            ctx.restore();
        }
    }

    getLeft(){
        return (this.cx - this.rx);
    }

    getTop(){
        return (this.cy - this.ry);
    }

    getRight(){
        return (this.cx + this.rx);
    }

    getBottom(){
        return (this.cy + this.ry);
    }
}


/*
commented to run locally without module bundler

export {
    Drawable,Group,Rect,Path,Circle,Polygon,Polyline,Line,Ellipse
}

*/