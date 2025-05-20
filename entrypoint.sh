#!/bin/sh
wait-for-it postgres:5432 -- \
wait-for-it redis:6379 -- \
wait-for-it kafka:9092 -- \
npm run start:dev
