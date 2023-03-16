
import {Group,Rect,Path,Circle,Polyline,Line,Ellipse,Polygon} from "./drawables";

let mapping = {
  rect: Rect,
  path: Path,
  circle: Circle,
  polyline: Polyline,
  line: Line,
  ellipse: Ellipse,
  polygon: Polygon
}

//traverse svg dom and convert svg objects to command objects
function traverse(svg){
    let children = [...svg.children];
    let groupElems = [];
    while(children.length > 0){
        //console.log("start",children);
        let ch = children.shift(); //get first
        if (ch.hasOwnProperty("divider")){
            let elems = groupElems.slice(-(ch.childCount)); //last n items
            let g = new Group(ch.groupSvg,...elems);
            groupElems = groupElems.slice(0,groupElems.length - ch.childCount);
            groupElems.push(g);
            continue;
        }
        switch(ch.tagName){
            case "g":
                let divider = {"divider":true,"childCount": ch.children.length,"groupSvg":ch};
                children.unshift(...ch.children,divider); //add to the beginning
                break;
            default:
                let clazz = mapping[ch.tagName];
                let instance = new clazz(ch);
                groupElems.push(instance);
        }
    }
    if (groupElems.length === 1){
      return groupElems[0];
    }
    return groupElems;
}


export {
  traverse
}
