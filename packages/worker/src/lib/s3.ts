export async function fetchFromR2(
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
  key: string,
  contentType: string,
): Promise<Response | null> {
  const host = `${accountId}.r2.cloudflarestorage.com`
  const url = `https://${host}/${bucket}/${encodeURIComponent(key)}`

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "")
  const datestamp = amzDate.slice(0, 8)

  const canonicalUri = `/${bucket}/${encodeURIComponent(key)}`
  const canonicalQuerystring = ""
  const payloadHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date"
  const canonicalRequest = `GET\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`

  const algorithm = "AWS4-HMAC-SHA256"
  const credentialScope = `${datestamp}/auto/s3/aws4_request`
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`

  const signature = await hmacSha256Hex(
    await hmacSha256(
      await hmacSha256(
        await hmacSha256(await hmacSha256("AWS4" + secretAccessKey, datestamp), "auto"),
        "s3",
      ),
      "aws4_request",
    ),
    stringToSign,
  )

  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const response = await fetch(url, {
    headers: {
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorization,
    },
  })

  if (!response.ok) return null

  return new Response(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

async function sha256Hex(input: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return bytesToHex(new Uint8Array(hash))
}

async function hmacSha256(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const keyBuf = typeof key === "string" ? new TextEncoder().encode(key) : key
  const algo = { name: "HMAC", hash: "SHA-256" }
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuf, algo, false, ["sign"])
  return crypto.subtle.sign(algo, cryptoKey, new TextEncoder().encode(data))
}

async function hmacSha256Hex(key: string | ArrayBuffer, data: string): Promise<string> {
  const buf = await hmacSha256(key, data)
  return bytesToHex(new Uint8Array(buf))
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
