#!/bin/bash

for svg in add-on/icons/*.svg; do
    for size in 19 38 128; do
        png=add-on/icons/png/$(basename -s .svg ${svg})_${size}.png
        inkscape -z -e $png -w $size -h $size $svg
        optipng -o7 -i0 $png
    done
done
