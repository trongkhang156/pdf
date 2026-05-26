let pdfjsPromise: Promise<any> | null = null;

export function loadPdfJS(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).pdfjsLib) {
    return Promise.resolve((window as any).pdfjsLib);
  }
  if (pdfjsPromise) {
    return pdfjsPromise;
  }

  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.async = true;
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      resolve(pdfjsLib);
    };
    script.onerror = (err) => {
      pdfjsPromise = null;
      reject(new Error("Không thể tải thư viện xử lý PDF (pdf.js) từ CDN."));
    };
    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

export async function extractImagesFromPdf(file: File): Promise<string[]> {
  try {
    const pdfjsLib = await loadPdfJS();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Limit search to first 12 pages to avoid freezing on very large PDF documents
    const scanPagesCount = Math.min(pdf.numPages, 12);
    const pageNums = Array.from({ length: scanPagesCount }, (_, i) => i + 1);

    // Process all pages in parallel!
    const pagePromises = pageNums.map(async (pageNum) => {
      try {
        const page = await pdf.getPage(pageNum);
        const operatorList = await page.getOperatorList();
        const fnArray = operatorList.fnArray;
        const argsArray = operatorList.argsArray;

        // Find all image operators in this page
        const imageOps: { objId: string; opIndex: number }[] = [];
        for (let i = 0; i < fnArray.length; i++) {
          const op = fnArray[i];
          if (
            op === pdfjsLib.OPS.paintImageXObject ||
            op === pdfjsLib.OPS.paintImageMaskXObject ||
            op === pdfjsLib.OPS.paintJpegXObject
          ) {
            imageOps.push({
              objId: argsArray[i][0],
              opIndex: i,
            });
          }
        }

        if (imageOps.length === 0) {
          return [];
        }

        // Process all image operators of this page in parallel!
        const imagePromises = imageOps.map(async ({ objId }) => {
          try {
            const imgObj = await new Promise<any>((resolve) => {
              try {
                if (page.objs.has(objId)) {
                  page.objs.get(objId, (obj: any) => resolve(obj));
                } else if (page.commonObjs && page.commonObjs.has(objId)) {
                  page.commonObjs.get(objId, (obj: any) => resolve(obj));
                } else {
                  let resolved = false;
                  page.objs.get(objId, (obj: any) => {
                    if (!resolved) {
                      resolved = true;
                      resolve(obj);
                    }
                  });
                  if (page.commonObjs) {
                    page.commonObjs.get(objId, (obj: any) => {
                      if (!resolved) {
                        resolved = true;
                        resolve(obj);
                      }
                    });
                  }
                  
                  // Set fallback timeout so it never hangs
                  setTimeout(() => {
                    if (!resolved) {
                      resolved = true;
                      resolve(null);
                    }
                  }, 200);
                }
              } catch (e) {
                resolve(null);
              }
            });

            // Filter out tiny noise (like small visual symbols/bullets) under 35px
            if (imgObj && imgObj.width > 35 && imgObj.height > 35) {
              const canvas = document.createElement("canvas");
              canvas.width = imgObj.width;
              canvas.height = imgObj.height;
              const ctx = canvas.getContext("2d");

              if (ctx) {
                let drawSuccess = false;

                if (imgObj.bitmap) {
                  // Direct clean upright draw for processed ImageBitmap
                  ctx.drawImage(imgObj.bitmap, 0, 0);
                  drawSuccess = true;
                } else if (imgObj.data) {
                  const imgData = ctx.createImageData(imgObj.width, imgObj.height);
                  if (imgObj.data.length === imgObj.width * imgObj.height * 4) {
                    imgData.data.set(imgObj.data);
                  } else if (imgObj.data.length === imgObj.width * imgObj.height * 3) {
                    let j = 0;
                    for (let k = 0; k < imgObj.data.length; k += 3) {
                      imgData.data[j] = imgObj.data[k];
                      imgData.data[j + 1] = imgObj.data[k + 1];
                      imgData.data[j + 2] = imgObj.data[k + 2];
                      imgData.data[j + 3] = 255;
                      j += 4;
                    }
                  }
                  ctx.putImageData(imgData, 0, 0);
                  drawSuccess = true;
                }

                if (drawSuccess) {
                  return canvas.toDataURL("image/png");
                }
              }
            }
          } catch (err) {
            console.error("Lỗi trích xuất hình trên trang:", err);
          }
          return null;
        });

        const urls = await Promise.all(imagePromises);
        return urls.filter((url): url is string => url !== null);
      } catch (pageError) {
        console.error(`Lỗi trích xuất trang ${pageNum}:`, pageError);
        return [];
      }
    });

    // Wait for all pages to finish processing. Promise.all preserves index order!
    const pagesResults = await Promise.all(pagePromises);
    return pagesResults.flat();
  } catch (error) {
    console.error("Trích xuất hình lỗi:", error);
    return [];
  }
}
