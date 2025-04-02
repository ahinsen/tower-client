curl -X GET "http://localhost:8003/values?q={\"validAt\":{\"\$gte\":1735689600000,\"\$lte\":1743292800000}}" -H "Content-Type: application/json"
curl -X GET 'http://localhost:8003/values?q={"validAt":{"$gte":1735689600000,"$lte":1743292800000}}' -H "Content-Type: application/json"
curl -X GET 'http://localhost:8003/values?q={"validAt":{"$gte":1735689600000,"$lte":1743292800000}}' -H "Content-Type: application/json"
curl -X GET "http://localhost:8003/values?q=%7B%22validAt%22%3A%7B%22%24gte%22%3A1735689600000%2C%22%24lte%22%3A1743292800000%7D%7D" -H "Content-Type: application/json"