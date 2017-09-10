# breakpoint-img-tool

This is a tool to generate various optimised images with responsive breakpoints along with CSVs to self host the images.

Probably better to use a CDN for bigger sites but it is useful for internal websites or simple sites that you want to keep everything in house.

### Notes: 

..* It mimics the directory structure inside the input folder in the output folder
..* It overwrites the csv from the previous build
..* It overwrites images from the previous build but does not delete ones where there is no naming conflict
..* File names are used as the ID for the CSV 

## Usage

### Requirements

You need these installed:
```
node.js
npm
```

### Setup

Just run
```
npm install
```

### Running

```
node index.js
```

### Config

It is all hard coded in the file in the config area. There are comments indicating what each section does so hopefully should not be too hard to tweak.

### Re-run

The output items are not deleted but the images get overwritten if the input files are not changed and if an original file gets renamed a new one is created

## Data structure (CSVs)

### Tables

Sections covers the structure of the CSVs generated. Two are created images.csv and srcsets.csv. Structured in a relational database style for easy querying.

#### images

imageid              |description |url                                         |
---------------------|------------|--------------------------------------------|
image-file-name-1    |            |original/image-file-name-1.jpg              |
image-file-name-2    |            |original/img/image-file-name-2.png          |

#### srcsets

srcsetid                      |imageid                 |url                                     |width |
------------------------------|------------------------|----------------------------------------|------|
image-file-name-1-w327        |image-file-name-1       |/public/image-file-name-1-w327.jpg       |327   |
image-file-name-1-w200        |image-file-name-1       |/public/image-file-name-1-w200.jpg       |327   |
image-file-name-2-w327        |image-file-name-2       |/public/img/image-file-name-2-w327.png   |200   |
image-file-name-2-w200        |image-file-name-2       |/public/img/image-file-name-2-w200.png   |200   |

#### Notes:

There is a description column that is not used. It was an attempt to get an alt tag (html img element property) description from image metadata so that the images in the original folder become the absolute source of truth. There were issues getting various exif/iptc/xmp readers working and differences between image formats for storing the data made extraction difficult.

### Querying the data

I use this query to generate the correct image properties. I used Postgres to run the queries so you may need to modify it for other databases.

Note: The fallback for srcset is url which is the highest width available that may not be ideal for you.

```
SELECT imageid, description, urls[1] AS url, srcset
  FROM (
    SELECT s.imageid,
           i.description,
           array_agg(s.url ORDER BY s.width desc) AS urls,
           array_to_string(array_agg((s.url || ' ' || s.width || 'w') ORDER BY s.width asc) ,', ' ) AS srcset
    FROM srcset  s
    JOIN images i ON i.imageid = s.imageid
    GROUP BY s.imageid, i.description
  ) t
```
#### Output

Just a note I manually fill in the description field if needed and do a git diff on results to merge any changes with the new images

imageid               |description |url                                       |srcset                                                       
----------------------|------------|------------------------------------------|-----------------------------------------------------------------------------------------
image-file-name-1     |            |/public/image-file-name-1-w327.png        |/public/image-file-name-1-w200.jpg 200w, /public/image-file-name-1-w327.jpg 327w
image-file-name-2     |            |/public/img/image-file-name-2-w327.png    |/public/img/image-file-name-2-w200.png 200w, /public/img/image-file-name-2-w327.png 327w



## TODO/Ideas
..* Try to find a good way to auto populate the description column
..* Add option to enforce unique files naming or imageids to detect duplicates
..* Possibly generate a unique ID based on folder structure it took to get to the file
..* Fix config to possibly extra parameters and a default config
..* Thinking of modifying the script to generate two sets of files one for webp and fallback in the original format ie jpg | png etc
..* Possibly add crc check duplicate file detection in original
..* Possibly add detection on files that have already been processed from a previous run and skip based on config setting
..* Possibly generate a unique ID based on folder structure it took to get to the file

### Contributions welcome