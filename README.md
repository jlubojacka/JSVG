
# JSVG
## Javascript representation of SVG


This small utility facilitates converting SVG elements into 
Javascript objects. 
This can be useful if you draw
many copies of same SVG on HTML Canvas and 
want to change some properties based on user input.

Abstract class *Drawable* offers mappings for basic shapes and paths.
**JSVG** converts every SVG element to specific Javascript class which handles 
proper drawing of shape on canvas via low-level Canvas API.


Without **JSVG** simple change of color requires changing original SVG file, 
creating new ```<image>``` and draw it on canvas. There are too many steps for real-time 
update to respond to user actions (for example highlighting elements on canvas
on hover).

With **JSVG** you can change properties of Drawable instance and call method *draw()* to easily
update canvas. 

### Example

<svg width="450" height="220" id="test">
    <circle cx="100" cy="100" r="50" fill="MidnightBlue" />
    <line x1="50" y1="50" x2="100" y2="200" stroke="salmon" stroke-width="10" />
    <g>
        <polygon points="110,70 250,120 300,220" fill="seagreen" />
        <rect x="170" y="5" width="100" height="80" fill="orange" rx="10" ry="10" />
    </g>
    <ellipse cx="350" cy="100" rx="100" ry="75" fill="skyblue" />
    <path d="M 10,100 Q 150,100 250,250" stroke="blue" stroke-width="10" fill="none"/>
</svg>

````svg
<svg width="450" height="220" id="test">
    <circle cx="100" cy="100" r="50" fill="MidnightBlue" />
    <line x1="50" y1="50" x2="100" y2="200" stroke="salmon" stroke-width="10" />
    <g>
        <polygon points="110,70 250,120 300,220" fill="seagreen" />
        <rect x="170" y="5" width="100" height="80" fill="orange" rx="10" ry="10" />
    </g>
    <ellipse cx="350" cy="100" rx="100" ry="75" fill="skyblue" />
    <path d="M 10,100 Q 150,100 250,250" stroke="blue" stroke-width="10" fill="none"/>
</svg>
````

Such SVG is converted to array of five objects:

```javascript
[Circle, Line, Group, Ellipse, Path]
```
The instance of class Circle has these properties:

* cx : 100
* cy : 100
* fill : "MidnightBlue"
* radius : 50
* visible : true

You can directly change these values and then call method *draw* to update canvas.

```javascript
let canvas = document.querySelector("#canvas");
let canvasContext = canvas.getContext("2d");

let testSvg = document.querySelector("#test");
let jsvg = traverse(testSvg);

/* print color of second child eg. Rectangle inside Group */
console.log(jsvg[2].children[1].fill) // -> "orange"
jsvg[2].children[1].fill = "blue";

for(let element of jsvg){
    element.draw(canvasContext);
}
```
