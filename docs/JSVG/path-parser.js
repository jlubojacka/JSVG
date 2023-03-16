/*
Encapsulates methods for parsing svg path from 'd' attribute
Output: method 'parse' returns absolute points of provided input path
*/
class PathParser{

    constructor(){
        this.alpha = /[achlmqstvzACHLMQSTVZ]/;
        this.separator = /[\s,;]+/;
        this.curveParams = {
          "a": {step: 7, start: 5},
          "c": {step: 6, start: 4},
          "s": {step: 4, start: 2},
          "q": {step: 4, start: 2},
          "t": {step: 2, start: 0}
        };
        this.mapping = {
            "m":"handleMs",
            "z":"handleZs",
            "l":"handleLs",
            "h":"handleHs",
            "v":"handleVs",
            "a":"handleCurves",
            "c":"handleCurves",
            "s":"handleCurves",
            "q":"handleCurves",
            "t":"handleCurves"
        }
    }

    parse(pathStr){
        this.allPoints = [];
        this.initPoint = {};
        this.currPoint = {};
        this.pathString = pathStr;
        this.counter = 0;

        let i=0;
        while(this.pathString.length > 0){
            let char = this.pathString[0];
            //console.log(this.counter,this.pathString);
            //console.log("curr",currPoint);
            if (PathParser.isAlpha(char)){
              let commandLower = char.toLowerCase();
                if (!Object.keys(this.mapping).includes(commandLower)){
                  //skip unknown commands
                  console.log("Unknown command", char);
                  this.skipParams();

                } else {
                  let action = this.mapping[commandLower];
                  this[action]();
                }
            }else if (PathParser.isSeparator(char)){
                console.log("Separator ", char);
                this.updateOne();
            }else if (PathParser.isDigit(char)){
                console.log("Should not be digit here!",this.counter);
                this.updateOne();
            }else{
                this.updateOne();
            }
            i++;
            if (i > pathStr.length){
                console.log("endless loop");
                break;
            }
        }
        //console.log(this.counter,this.allPoints);
        return this.allPoints;
    }

    static isDigit(char){
        return /\d/.test(char);
        //return (char >= '0' && char <= '9');
    }

    static isAlpha(char){
        return /[a-zA-Z]/.test(char);
    }

    static isSeparator(char){
        return /[\s,;]/.test(char);
    }

    savePoint(){
        this.allPoints.push({"x":this.currPoint.x,"y":this.currPoint.y});
    }

    updateOne(){
        let trimmed = this.pathString.slice(1);
        this.pathString = trimmed;
        this.counter += 1;
    }

    updateVars(nextIdx){
        if (nextIdx === -1){
            this.counter += this.pathString.length;
            this.pathString = "";
        }else{
            this.counter += nextIdx;
            let p = this.pathString.slice(nextIdx);
            this.pathString = p;
        }
    }

    processPoints(start,char,points,step){
        let i=start;
        while(i < points.length){
            if (char == char.toLowerCase()){ //lowercase command
                let x = this.currPoint.x + points[i];
                let y = this.currPoint.y + points[i+1];
                this.currPoint.x = x;
                this.currPoint.y = y;
            }else{
                this.currPoint.x = points[i];
                this.currPoint.y = points[i+1];
            }
            this.savePoint();
            i += step;
        }
    }

    skipParams(){
      let path = this.pathString.slice(1);
      let nextIdx = path.search(this.alpha);
      let idx = (nextIdx === -1)? nextIdx : nextIdx + 1;
      this.updateVars(idx);
    }

    getParams(p){
        let path = p.slice(1);
        let nextIdx = path.search(this.alpha);
        path = (nextIdx === -1) ? path : path.slice(0,nextIdx);
        //handle minus sign without space preceding it
        //do not add space to exponential form of floating number (eg. 2e-4)
        path = path.replace(/(\d+)(-)(\d+)/g,"$1 $2$3");
        let parts = path.split(this.separator);
        parts = parts.filter((p)=> {return p !== ""});
        parts = this.handleRounding(parts);
        let points = parts.map(p => {return parseFloat(p)});
        let idx = (nextIdx === -1) ? nextIdx : nextIdx + 1;
        return [idx,points];
    }

    handleRounding(parts){
        //decimal point rounding to 2 places
        return parts.map((p)=>{
            let idx = p.indexOf(".");
            if ((idx == -1) || (p.includes('e'))){
                return p
            }else{
                return p.slice(0,idx+3)
            }
        });
    }

    handleMs(){
        let [nextIdx,points] = this.getParams(this.pathString);
        let char = this.pathString[0];
        if (points.length >= 2) {
            if ((this.counter == 0) || (char === "M")) { //always absolute if m/M is at the beginning of path
                this.initPoint.x  = points[0];
                this.initPoint.y = points[1];
            } else { //relative
                this.initPoint.x = this.currPoint.x + points[0];
                this.initPoint.y = this.currPoint.y + points[1];
            }
            this.currPoint.x = this.initPoint.x;
            this.currPoint.y = this.initPoint.y;
            this.savePoint();
            //other points form lineto command parameters
            this.processPoints(2,char,points,2);
        }
        this.updateVars(nextIdx);

    }

    handleLs(){
        let pathString = this.pathString;
        let [nextIdx,points] = this.getParams(pathString);
        this.processPoints(0,pathString[0],points,2);
        this.updateVars(nextIdx);
    }

    handleHs(){
        let pathString = this.pathString;
        let [nextIdx,points] = this.getParams(pathString);

        if(pathString[0] === "h"){
            let x = this.currPoint.x + points[0];
            let y = this.currPoint.y;
            this.currPoint.x = x;
            this.currPoint.y = y;
        }else{
            let y = this.currPoint.y;
            this.currPoint.x = points[0];
            this.currPoint.y = y;
        }
        this.savePoint();
        this.updateVars(nextIdx);
    }

    handleVs(){
        let pathString = this.pathString;
        let [nextIdx,points] = this.getParams(pathString);
        if (points.length === 1){
            if(pathString[0] === "v"){
                let x = this.currPoint.x ;
                let y = this.currPoint.y + points[0];
                this.currPoint.x = x;
                this.currPoint.y = y;
            }else{
                let x = this.currPoint.x;
                this.currPoint.x = x;
                this.currPoint.y = points[0];
            }
            this.savePoint();
            this.updateVars(nextIdx);
        }
    }

    handleZs(){
        this.currPoint.x = this.initPoint.x;
        this.currPoint.y = this.initPoint.y;
        this.savePoint();
        this.updateVars(1);
    }

    handleCurves(){
      let pathString = this.pathString;
      let [nextIdx,points] = this.getParams(pathString);
      let char = pathString[0];
      let curveParam = this.curveParams[char.toLowerCase()];

      this.processPoints(curveParam.start,char,points,curveParam.step);
      this.updateVars(nextIdx);
    }
}

/*
let t0 = "M300,200 h-150 a150,150 0 1,0 150,-150 L 9.1e-4 2e-3 z";
let t2 = "m-262.44 1191.4s35.791 35.397 71.573-0.3746L9.1e-4 2e-3z";
let t = "m-92.437 1117.5v66c0 1.6749 0.16293 3.3298 0.47852 4.961 0.31558 1.6311 0.78471 3.239 1.4004 4.8183 0.61567 1.5793 1.3771 3.1311 2.2773 4.6504s1.94 3.0058 3.1094 4.457c1.1694 1.4513 2.4676 2.8672 3.8906 4.2422s2.9697 2.7094 4.6309 4c1.6612 1.2907 3.4385 2.5362 5.3223 3.7344s3.8739 2.3478 5.9648 3.4453c2.091 1.0976 4.2818 2.144 6.5645 3.1328 2.2827 0.9889 4.6583 1.9211 7.1172 2.793 2.4588 0.872 5.0016 1.6827 7.6211 2.4297 2.6195 0.7469 5.3153 1.4291 8.0801 2.043 5.5295 1.2276 11.334 2.1817 17.352 2.8281 3.0087 0.3232 6.0703 0.5687 9.1777 0.7344 3.1075 0.1656 6.2605 0.2519 9.4512 0.2519 3.1907 0 6.3437-0.086 9.4512-0.2519 3.1075-0.1657 6.169-0.4112 9.1777-0.7344 6.0174-0.6464 11.822-1.6005 17.352-2.8281 2.7648-0.6139 5.4605-1.2961 8.0801-2.043 2.6195-0.747 5.1622-1.5577 7.6211-2.4297 2.4588-0.8719 4.8345-1.8041 7.1172-2.793 2.2826-0.9888 4.4735-2.0352 6.5644-3.1328 2.091-1.0975 4.081-2.2471 5.9648-3.4453 1.8838-1.1982 3.6611-2.4437 5.3223-3.7344 1.6612-1.2906 3.2078-2.625 4.6309-4s2.7212-2.7909 3.8906-4.2422c1.1694-1.4511 2.2091-2.9377 3.1094-4.457s1.6617-3.0711 2.2773-4.6504c0.61568-1.5793 1.0848-3.1872 1.4004-4.8183 0.31559-1.6312 0.47852-3.2861 0.47852-4.961-8.3329 0.1048-15.086 0.1564-21.326 0.1758 6.2402-0.019 12.993-0.071 21.326-0.1758v-66c9.1e-4 26.456-41.385 47.902-92.438 47.902-51.052 1e-4 -92.438-21.446-92.437-47.902z"
let t3 = "m-92.438 1116.5v66c34.598 0.036 41.386 1e-4 92.438 0 25.526 0 40.302 0.1039 52.863 0.1563 12.561 0.052 22.908 0.053 39.574-0.1563v-66c9.07e-4 26.456-41.385 47.902-92.438 47.902-51.052 1e-4 -92.438-21.446-92.438-47.902z";
let t4 = "m6.6641 67.32-0.01562 0.049c-0.93862 2.7567-1.7594 5.5118-2.4648 8.2676-0.70541 2.7557-1.2941 5.5125-1.7656 8.2675-0.47155 2.755-0.82743 5.5092-1.0645 8.2637-0.23702 2.7546-0.35558 5.5093-0.35742 8.2637-0.0018 2.7544 0.11365 5.5072 0.34766 8.2617s0.58614 5.5107 1.0566 8.2656c0.4705 2.7549 1.0599 5.5101 1.7676 8.2657 0.70766 2.7555 1.533 5.5111 2.4785 8.2675l0.01953 0.061c0.21546 0.282 0.37447 0.578 0.59961 0.8574 1.1694 1.4513 2.4676 2.8672 3.8906 4.2422 1.423 1.375 2.9697 2.7094 4.6309 4 1.6612 1.2907 3.4385 2.5362 5.3223 3.7344s3.8739 2.3478 5.9648 3.4453c2.091 1.0976 4.2818 2.144 6.5645 3.1328 2.2827 0.9889 4.6583 1.9211 7.1172 2.793 2.4588 0.872 5.0016 1.6826 7.6211 2.4296 2.6195 0.7469 5.3153 1.4291 8.0801 2.043 5.5295 1.2276 11.334 2.1817 17.352 2.8281 3.0087 0.3232 6.0703 0.5687 9.1777 0.7344 3.1075 0.1656 6.2605 0.252 9.4512 0.252 3.1907 0 6.3437-0.086 9.4512-0.252 3.1075-0.1657 6.169-0.4112 9.1777-0.7344 3.3149-0.3561 6.3833-1.0214 9.5586-1.5586 0.94074-2.7454 1.7659-5.4898 2.4707-8.2343 0.70766-2.7556 1.2951-5.5108 1.7656-8.2657 0.4705-2.7548 0.82264-5.5091 1.0566-8.2636s0.35145-5.5093 0.34961-8.2637c-2e-3 -2.7544-0.12235-5.5091-0.35937-8.2637-0.23703-2.7545-0.59096-5.5086-1.0625-8.2636-0.47155-2.755-1.0602-5.5099-1.7656-8.2657-0.70541-2.7557-1.5282-5.5128-2.4668-8.2695l-0.1582-0.4668c-8.8903 1.4742-18.183 2.4824-28.018 2.4824-38.905 1e-4 -72.134-12.47-85.773-30.105z"

let parser = new PathParser();

let points = parser.parse(t4);
console.log(points);
*/

/*
exports = {
  PathParser
}
*/
