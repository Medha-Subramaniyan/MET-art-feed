// Each Met department is a room with its own wall color.
// Modern Art isn't here because it's nearly all under copyright, so the API has no images for it.
// wall/floor/type are sRGB hex. light is the color of the lamps in that room.
export const ROOMS = [
    {
        id: 11, name: 'European Paintings', frame: 'gilt',
        intro: 'Six centuries of painted light, seen the way it was first seen: by a single source, in a dark room.',
        wall: '#7a2a1f', floor: '#2a211d', type: '#f1dcc0', light: '#ffe2bd',
    },
    {
        id: 19, name: 'Photographs', frame: 'paper',
        intro: 'Silver, salt, and platinum. A photograph is a record of light, so here it gets very little of it.',
        wall: '#3a3a3b', floor: '#1f1d1b', type: '#ece9e2', light: '#fff1de',
    },
    {
        id: 9, name: 'Drawings and Prints', frame: 'paper',
        intro: 'The closest thing a museum has to handwriting. Paper is fragile, so step in and read it slowly.',
        wall: '#a39a88', floor: '#262220', type: '#2e180a', light: '#ffeacb',
    },
    {
        id: 6, name: 'Asian Art', frame: 'slim',
        intro: 'Ink, silk, and clay, from across a continent and several thousand years.',
        wall: '#3f7a6c', floor: '#1b2120', type: '#e4f1e6', light: '#fff0d8',
    },
    {
        id: 14, name: 'Islamic Art', frame: 'slim',
        intro: 'Pages, tiles, and textiles, where pattern and script do the work of the figure.',
        wall: '#20395f', floor: '#171b23', type: '#ece2c8', light: '#ffe9c9',
    },
    {
        id: 15, name: 'The Robert Lehman Collection', frame: 'gilt',
        intro: 'One family’s collection, gathered over two generations and kept together.',
        wall: '#4a2c40', floor: '#211b1f', type: '#eedfd2', light: '#ffe4c2',
    },
];
