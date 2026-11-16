#!/bin/bash
# flora_up.sh XGOOGDATE EXPIRY file:uuid:signature ...   (POST a file into a Flora signed-url slot; the policy is rebuilt
# from the slot's key/date, which is exactly what flora_create_asset signs). Content type from the extension.
D=$1; E=$2; shift 2
C=vercel-app-prod@flora-prod-455015.iam.gserviceaccount.com/${D:0:8}/auto/storage/goog4_request
P=mcp-uploads/${D:0:4}/${D:4:2}/${D:6:2}/${FLORA_USER:?set FLORA_USER to the user_... path segment from flora_create_asset}
for t in "$@"; do
  f=${t%%:*}; r=${t#*:}; u=${r%%:*}; s=${r#*:}; ext=${f##*.}
  case $ext in png) ct=image/png;; jpg|jpeg) ct=image/jpeg;; glb) ct=model/gltf-binary;; *) ct=application/octet-stream;; esac
  key=$P/$u.$ext
  pol=$(printf '{"conditions":[["content-length-range",1,367001600],{"Content-Type":"%s"},{"bucket":"flora-assets-prod"},{"key":"%s"},{"x-goog-date":"%s"},{"x-goog-credential":"%s"},{"x-goog-algorithm":"GOOG4-RSA-SHA256"}],"expiration":"%s"}' "$ct" "$key" "$D" "$C" "$E" | base64 -w0)
  curl -s -o /dev/null -w "%{http_code} $f\n" https://storage.googleapis.com/flora-assets-prod/ \
   --form-string "Content-Type=$ct" --form-string "key=$key" --form-string "x-goog-date=$D" --form-string "x-goog-credential=$C" \
   --form-string "x-goog-algorithm=GOOG4-RSA-SHA256" --form-string "policy=$pol" --form-string "x-goog-signature=$s" -F "file=@$f;type=$ct"
done
