// Common
const fs = require('fs')
const readdirp = require('readdirp') 

// Image optimising 
const sharp = require('sharp')
const imagemin = require('imagemin')

// Plugins
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')

// CSV generation
const csvwriter = require('csv-write-stream')

//#############
// Config
//#############

// Specify folders here
const input = 'original/'
const output = 'public/'

// Specify breakpoints here
const breakpoints = [200,327,430,513,601,679,758,838,905,981,1051,1124,1197,1234,1250]

// Sharp is only used for resizing not sure what tweaking quality will do before it hits imagemin
// http://sharp.dimens.io/en/stable/api-constructor/
const sharpConfig = {
      max : true,
      //quality : 60,
      progressive : true,
      withoutEnlargement: true
  }
// Tweak quality here for imagemin output
// https://github.com/imagemin/imagemin-mozjpeg
// https://github.com/imagemin/imagemin-pngquant
// for other plugins https://github.com/imagemin
const imageminConfig = {
  plugins: [
    imageminMozjpeg({quality: 90}),
    imageminPngquant({speed: 1, quality: '70'})
  ]}

// CSV formatting config
const writerConfig = {
  separator: ',',
  newline: '\n',
  sendHeaders: true
}

// Table structure, if you change this you need to change the parameters that get passed to the csv writer in the code
const imagesConfig = Object.assign({
  headers: ['imageid', 'description', 'url']
}, writerConfig);

const srcsetConfig = Object.assign({
  headers: ['srcsetid','imageid','url','width']
}, writerConfig);

// CSV files to write data to
let imagesWriter = csvwriter(imagesConfig)
imagesWriter.pipe(fs.createWriteStream('images.csv'))
let srcsetsWriter = csvwriter(srcsetConfig)
srcsetsWriter.pipe(fs.createWriteStream('srcsets.csv'))

// possible formats: png || tiff || jpg || raw || webp
// files in this list will not be ignored, 
// a messaged is logged to console if it hits an unsupported file but does not stop the script
const possible = {
  png: true,
  tiff: true,
  tif: true,
  jpg: true,
  jpeg: true,
  webp: true
}

//#############
// End config
//#############

console.log('### Starting ###')

// Create mirrored directories

readdirp({
  root: input,
  entryType: 'directories'
  })
  .on('data', entry =>{
    const parentPath = `./${output}${entry.parentDir}`
    if (!fs.existsSync(parentPath)) {
      fs.mkdirSync(parentPath);
    }
    const outputPath = `./${output}${entry.path}`
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath);
    }
  })

// Create optimised mirrored versions of the files
// And write file details to csv

let filePromises = []

readdirp({
  root: input,
  entryType: 'files'
}).on('data', entry => {

  const inputPath = `${input}${entry.path}` 
  const imageid =  entry.name.split('.').shift()  
  const url = inputPath
  const currentFormat = entry.name.split('.').pop() 
  const outputFormat = (currentFormat === 'tif') ? 'png' : currentFormat
  const imageRecord = [imageid, '', inputPath]

  // Check file supported
  if(!possible[currentFormat]){
    console.log(`Invalid file type in input directory, skipping: ${entry.fullPath}`)
    return false
  }
  
  imagesWriter.write([imageid, '', inputPath])

  breakpoints.map( size => {
    const outputPath = `${output}${entry.parentDir}/${imageid}-w${size}.${outputFormat}`
    // this tif bit was an attempt to store meta data for the description in a tif to import into the database before converting the file to the final png
    const image = (currentFormat === 'tif') ? sharp(inputPath,sharpConfig).resize(size).png().toBuffer() : sharp(inputPath,sharpConfig).resize(size).toBuffer()  

    filePromises.push(
      image
      .then( buffer => imagemin.buffer(buffer, imageminConfig))
      // Not sure if sharp is the best thing to use to write files but it works
      .then( buffer =>  sharp(buffer).toFile(outputPath, buffer, err => err ? reject(err) : resolve(data)))
      // Extra forward slash is for the webserver formatting pointing to the public directory
      .then( () => { srcsetsWriter.write([`${imageid}-w${size}`, imageid, `/${outputPath}`, size]) })
    )
  })
}).on('end', () => {
  Promise.all(filePromises)
    .then( () => {  
      imagesWriter.end()
      srcsetsWriter.end()
      console.log('### Finished ###')
    })
})


