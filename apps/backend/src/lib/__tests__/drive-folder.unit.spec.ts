import { folderIdOf, isDriveId, parseFolderPage } from "../drive-folder"

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345"

const entry = (id: string, href: string, icon: string, title: string) =>
  `<div class="flip-entry" id="entry-${id}" tabindex="0" role="link"><div class="flip-entry-info"><a href="${href}" target="_blank"><div class="flip-entry-list-icon">${icon}</div><div class="flip-entry-title">${title}</div></a></div></div>`
const icon = (type: string) =>
  `<img src="https://drive-thirdparty.googleusercontent.com/16/type/${type}" alt=""/>`

describe("Google Drive folders", () => {
  it("finds the folder in every kind of link", () => {
    for (const link of [
      `https://drive.google.com/drive/folders/${ID}`,
      `https://drive.google.com/drive/folders/${ID}?usp=sharing`,
      `https://drive.google.com/drive/u/7/folders/${ID}`,
      `drive.google.com/drive/mobile/folders/${ID}?usp=drive_link`,
      `https://drive.google.com/open?id=${ID}`,
      ` https://drive.google.com/folderview?usp=sharing&id=${ID} `,
    ]) {
      expect(folderIdOf(link)).toBe(ID)
    }
  })

  it("refuses anything that is not one", () => {
    for (const link of [
      "",
      "paste google drive folder link here",
      "https://example.com/x",
      "https://drive.google.com/drive/my-drive",
      "https://drive.google.com/drive/folders/../../etc",
      `https://drive.google.com/file/d/${ID}/view`,
    ]) {
      expect(folderIdOf(link)).toBeNull()
    }
    expect(isDriveId("../../admin/users/abcdef")).toBe(false)
  })

  it("reads photos and folders, and leaves other files out", () => {
    const html = [
      entry(
        "1aaaaaaaaaaaaaaaaaaa",
        "https://drive.google.com/drive/folders/1aaaaaaaaaaaaaaaaaaa",
        "",
        "Vases"
      ),
      entry(
        "1bbbbbbbbbbbbbbbbbbb",
        "https://drive.google.com/file/d/1b/view",
        icon("image/png"),
        "Tulips &amp; Truffles &#39;s.png"
      ),
      entry(
        "1ccccccccccccccccccc",
        "https://drive.google.com/file/d/1c/view",
        icon("image/heif"),
        "100 red roses"
      ),
      entry(
        "1ddddddddddddddddddd",
        "https://drive.google.com/file/d/1d/view",
        icon("application/pdf"),
        "menu.pdf"
      ),
    ].join("")
    expect(parseFolderPage(html)).toEqual({
      folders: ["1aaaaaaaaaaaaaaaaaaa"],
      photos: [
        { id: "1bbbbbbbbbbbbbbbbbbb", name: "Tulips & Truffles 's.png" },
        { id: "1ccccccccccccccccccc", name: "100 red roses" },
      ],
    })
  })
})
