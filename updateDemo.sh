#!/bin/sh

git checkout gh-pages
git pull origin master
git commit -a -m "updated demo"
git push origin 
git checkout master
