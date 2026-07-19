# Infersia — hub-standard recipes

default:
    @just --list

dev:
    npm run dev

test:
    npm run build

build:
    npm run build

open:
    open http://localhost:5180
