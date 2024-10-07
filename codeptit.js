// created by: NguyenBui256

import fetch from 'node-fetch';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import readline from 'readline';

var cookie = "";
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var filename = ''; // Tên file
var compiler = '';

var tongSoBaiACDaLayVe = 0;
var tongSoFileTaoRa = 0;

function extractLinkBaiTap(html) {
    const hrefs = [];
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const rows = document.querySelectorAll('tr.bg--10th'); // Chọn hàng có class 'bg--10th'
    rows.forEach(row => {
        const firstTd = row.children[2]; // Lấy <td> thứ ba (chỉ số 2)
        const firstLink = firstTd.firstElementChild; // Lấy thẻ <a> đầu tiên trong <td>
        hrefs.push(firstLink.href);
    });
    // Tất cả các link bài tập đã lấy được
    return hrefs;
}

function laySubmitACId(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const rows = document.querySelectorAll('.status__table tbody tr');
    // Duyệt qua các lần submit và tìm lần submit đầu tiên có kết quả là "AC"
    for(const row of rows) {
        // Lấy cột chứa kết quả
        const resultColumn = row.querySelector('td:nth-child(4) span');
        // Nếu kết quả là "AC"
        if (resultColumn && resultColumn.textContent.trim() === 'AC') {
            // Lấy ID từ cột đầu tiên
            return row.querySelector('td:nth-child(1)').textContent.trim();
        }
    }
    // Trả về ID Submit có kết quả là "AC"
    return null;
}

// Hàm để trích xuất source code
function extractSourceCode(html, document) {
    const sourceCode = document.getElementById('source_code');
    const fileNameElement = document.querySelector('.submit__nav').children[0].firstElementChild;
    try {
        filename = fileNameElement.textContent;
    } catch (err) {
        console.error(err);
        return null;
    }
    if (sourceCode) {
        return sourceCode.value;
    } else {
        console.error('Source code không tồn tại.');
        return null;
    }
}

// Hàm để ghi source code ra file
function writeToFile(filename, data) {
    fs.writeFile(filename, data, (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        } else {
            console.log('File đã được ghi thành công:', filename);
            tongSoFileTaoRa++;
        }
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}  

// Hàm để lấy response HTML từ URL
async function fetchHTML(url) {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
              'Content-Type': 'text/html',
              'Cookie': cookie,
            }
          });
        const html = await response.text();
        return html;
    } catch (error) {
        console.error('Error fetching HTML:', error);
        return null;
    }
}

async function layLoiGiaiVaXuatFile(id, time) {
    tongSoBaiACDaLayVe++;
    const submitUrl = 'https://code.ptit.edu.vn/student/solution/'+id+'/edit'; 
    const html = await fetchHTML(submitUrl);
    if (html) {
        const dom = new JSDOM(html);
        const document = dom.window.document;
        const compilerName = document.getElementById('compiler').children[0].textContent;
        // console.log(compilerName);
        if (compilerName === 'Python 3') {
            compiler = '.py';
        } else if (compilerName === 'Java') {
            compiler = '.java';
        } else if (compilerName === 'C/C++') {
            compiler = '.cpp';
        }
        const value = extractSourceCode(html, document);
        if (value) {
            if(!fs.existsSync(compilerName)) {
                fs.mkdirSync(compilerName, {recursive: true});
            }
            // Ghi giá trị ra file
            writeToFile(compilerName + '/' + filename + compiler, value);
        }
    }
}

async function xuLyMotBai(urlBaitap) {
    const acSubmitHtml = await fetchHTML(urlBaitap);
    var acId = laySubmitACId(acSubmitHtml);
    if(acId != "") layLoiGiaiVaXuatFile(acId);
}

async function start() {
    const urlBaiTapTrang = "https://code.ptit.edu.vn/student/question?page=";
    for(let i = 1; i <= 3; i++) {
        const baiTapTrangHtml = await fetchHTML(urlBaiTapTrang+i);
        var baitap = extractLinkBaiTap(baiTapTrangHtml);
        for (const linkbai of baitap) {
            await xuLyMotBai(linkbai); // Xử lý mỗi bài
            await sleep(2000); // Chờ 2 giây trước khi xử lý bài tiếp theo
        }
        await sleep(2000);
    }
    console.log("Tổng số bài AC đã lấy về: " + tongSoBaiACDaLayVe);
}

async function main() {
    await rl.question('Nhập Cookie: ', (input) => {
        cookie = input;
        rl.close();
        start();
    });
}

main();
