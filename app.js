const $ = (s) => document.querySelector(s);
// Mọi số liệu chỉ tồn tại trong phiên đang mở. Trang không dùng localStorage,
// cookie hay gửi câu trả lời lên máy chủ.
const state = { mode: 'choice', topic: 'Tất cả', pool: [], index: 0, selected: null, checked: false, correct: 0, attempts: 0, sessionCorrect: 0 };
const norm = (v) => (v || '').toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]/g,'');
// Chuẩn hóa đáp án tự luận: chấp nhận cả danh pháp viết tắt trên tiêu bản và cách viết đầy đủ.
// Ví dụ: "DC giáp nắp" = "dây chằng giáp nắp", "TK trụ" = "thần kinh trụ".
function medicalNorm(value){
  let text = (value || '').toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  text = text
    .replace(/\b(?:d\s*\.?\s*c\s*\.?|day\s*chang)\b/g, 'day chang')
    .replace(/\b(?:t\s*\.?\s*k\s*\.?|than\s*kinh)\b/g, 'than kinh')
    .replace(/\b(?:d\s*\.?\s*m\s*\.?|dong\s*mach)\b/g, 'dong mach')
    .replace(/\b(?:t\s*\.?\s*m\s*\.?|tinh\s*mach)\b/g, 'tinh mach')
    .replace(/\b(?:x\s*\.?|xuong)\b/g, 'xuong');
  return text.replace(/[^a-z0-9]/g,'');
}
const saved = { mistakes: [], correct: 0, attempts: 0 };

// Đã đối chiếu trực tiếp hình trang 147 với bảng đáp án trang 148.
// Giữ cố định hai nhãn dễ nhầm ở vành tai, kể cả khi bộ câu hỏi được cập nhật sau này.
const AUDITED_LABELS = {
  '147:10': { answer: 'Lỗ ống tai ngoài', aliases: ['Lỗ ống tai ngoài', 'Ống tai ngoài'] },
  '147:11': { answer: 'Dái tai', aliases: ['Dái tai', 'Dái tai (tiểu thùy tai)'] }
};
QUESTION_BANK.forEach(q => {
  const checked = AUDITED_LABELS[`${q.sourceImagePage}:${q.n}`];
  if(checked) Object.assign(q, checked);
});

// Các thẻ kiến thức cốt lõi, ưu tiên thông tin có giá trị cho thi thực hành.
// Không suy diễn nguyên ủy/bám tận nếu cấu trúc không có dữ kiện đáng tin cậy.
const STUDY_NOTES = {
  'dai tai':'<b>Vị trí:</b> phần thấp, mềm của vành tai. <b>Cấu tạo:</b> mô liên kết và mỡ, không có sụn đàn hồi. <b>Mốc thực hành:</b> nằm dưới đối bình tai và khuyết gian bình tai.',
  'lo bit':'<b>Loại:</b> Mốc xương chậu. <b>Liên quan:</b> do xương mu và xương ngồi tạo nên, được màng bịt che gần hết; ống bịt ở bờ trên cho thần kinh và mạch bịt đi qua.',
  'lo go ma mat':'<b>Vị trí:</b> mặt ngoài xương gò má. <b>Thành phần qua lỗ:</b> thần kinh và mạch gò má-mặt. <b>Mẹo nhớ:</b> “gò má-mặt” đi ra mặt để cảm giác vùng gò má.',
  'lo tren o mat':'<b>Vị trí:</b> bờ trên ổ mắt xương trán. <b>Thành phần qua lỗ:</b> thần kinh, động mạch và tĩnh mạch trên ổ mắt. <b>Chi phối:</b> thần kinh trên ổ mắt là nhánh V1, cảm giác trán và da đầu trước.',
  'khuyet tren o mat':'<b>Vị trí:</b> bờ trên ổ mắt xương trán. <b>Thành phần qua khuyết:</b> thần kinh và mạch trên ổ mắt. <b>Mẹo nhớ:</b> khuyết/lỗ trên ổ mắt có cùng bó mạch-thần kinh.',
  'lo ong thi giac':'<b>Vị trí:</b> cánh nhỏ xương bướm. <b>Thành phần qua ống:</b> thần kinh thị giác (II) và động mạch mắt. <b>Mẹo nhớ:</b> “thị giác” đi cùng động mạch mắt vào ổ mắt.',
  'lo duoi o mat':'<b>Vị trí:</b> mặt trước xương hàm trên, dưới bờ ổ mắt. <b>Thành phần qua lỗ:</b> thần kinh và mạch dưới ổ mắt. <b>Chi phối:</b> thần kinh dưới ổ mắt là nhánh V2, cảm giác mi dưới, má, môi trên.',
  'lo cam':'<b>Vị trí:</b> mặt ngoài thân xương hàm dưới, thường gần răng tiền cối II. <b>Thành phần qua lỗ:</b> thần kinh và mạch cằm. <b>Chi phối:</b> thần kinh cằm (nhánh thần kinh răng dưới, V3) cảm giác cằm và môi dưới.',
  'khe o mat tren':'<b>Vị trí:</b> giữa cánh lớn và cánh nhỏ xương bướm. <b>Thành phần qua khe:</b> III, IV, V1, VI và tĩnh mạch mắt trên. <b>Mẹo nhớ:</b> các thần kinh vận nhãn đi qua khe ổ mắt trên.',
  'khe duoi o mat':'<b>Vị trí:</b> giữa hàm trên với cánh lớn xương bướm/xương gò má. <b>Thành phần qua khe:</b> thần kinh gò má, thần kinh dưới ổ mắt và các mạch đi kèm. <b>Liên quan:</b> thông ổ mắt với hố dưới thái dương-hố chân bướm khẩu cái.',
  'lo ong tai ngoai':'<b>Vị trí:</b> phần trai xương thái dương. <b>Chức năng:</b> là cửa vào ống tai ngoài, dẫn sóng âm đến màng nhĩ. <b>Mẹo nhớ:</b> phía sau-lên là mỏm chũm, phía trước là khớp thái dương-hàm.',
  'cung mac':'<b>Loại:</b> áo xơ trắng, đục của nhãn cầu; chiếm 5/6 sau. <b>Chức năng:</b> giữ hình dạng nhãn cầu và là nơi bám các cơ vận nhãn. <b>Liên tục:</b> ra trước chuyển tiếp thành giác mạc tại vùng rìa.',
  'giac mac':'<b>Loại:</b> phần trong suốt, không mạch của áo xơ nhãn cầu; chiếm 1/6 trước. <b>Chức năng:</b> môi trường khúc xạ chính của mắt. <b>Thần kinh:</b> rất nhạy cảm do nhánh V1 (thần kinh mi dài).',
  'the thuy tinh':'<b>Loại:</b> thấu kính trong suốt, hai mặt lồi, không mạch. <b>Liên quan:</b> treo bởi các sợi dây chằng Zinn nối thể mi. <b>Chức năng:</b> đổi độ cong để điều tiết, hội tụ ảnh lên võng mạc.',
  'ong le tren':'<b>Đường dẫn lệ:</b> bắt đầu từ điểm lệ trên, đi vào tiểu quản lệ trên. <b>Dòng chảy:</b> điểm lệ → tiểu quản → túi lệ → ống lệ mũi → ngách mũi dưới.',
  'ong le duoi':'<b>Đường dẫn lệ:</b> bắt đầu từ điểm lệ dưới, đi vào tiểu quản lệ dưới. <b>Mẹo nhớ:</b> tiểu quản dưới thường nhận phần lớn nước mắt trước khi đổ vào túi lệ.',
  'tieu quan le':'<b>Vị trí:</b> các ống nhỏ nối điểm lệ với túi lệ. <b>Chức năng:</b> dẫn nước mắt từ bờ mi trong về túi lệ; tiểu quản trên và dưới thường hợp thành tiểu quản chung.',
  'tui le':'<b>Vị trí:</b> hố túi lệ ở góc trong ổ mắt. <b>Chức năng:</b> nhận nước mắt từ tiểu quản lệ rồi liên tục xuống ống lệ mũi. <b>Mẹo nhớ:</b> tắc đường lệ thường gây chảy nước mắt.',
  'cuc le':'<b>Vị trí:</b> mô nhỏ màu hồng ở góc trong mắt. <b>Cấu tạo:</b> da biến đổi có tuyến bã và tuyến mồ hôi. <b>Không phải:</b> tuyến lệ chính.',
  'day chang mi mat trong':'<b>Nguyên ủy/bám:</b> nối hai sụn mi tại góc trong, bám vào vùng mào lệ trước. <b>Chức năng:</b> cố định góc trong mi mắt và liên quan sát túi lệ.',
  'day chang mi mat ngoai':'<b>Nguyên ủy/bám:</b> nối hai sụn mi ở góc ngoài, bám vào củ ổ mắt xương gò má. <b>Chức năng:</b> giữ vững góc ngoài mi mắt.',
  'nhu va diem le tren':'<b>Vị trí:</b> đầu trong bờ mi trên. <b>Chức năng:</b> điểm lệ là lỗ thu nước mắt vào tiểu quản lệ trên.',
  'nhu va diem le duoi':'<b>Vị trí:</b> đầu trong bờ mi dưới. <b>Chức năng:</b> điểm lệ là lỗ thu nước mắt vào tiểu quản lệ dưới.',
  'co nang mi mat':'<b>Nguyên ủy:</b> cánh nhỏ xương bướm, ngay trên ống thị giác. <b>Bám tận:</b> sụn mi trên và da mi trên qua cân cơ. <b>Thần kinh:</b> vận nhãn III. <b>Động tác:</b> nâng mi trên.',
  'sun mi tren':'<b>Loại:</b> tấm mô liên kết đặc trong mi trên. <b>Liên quan:</b> chứa các tuyến sụn mi (Meibomius) và nhận bám tận cân cơ nâng mi. <b>Chức năng:</b> tạo khung cho mi mắt.',
  'sun mi duoi':'<b>Loại:</b> tấm mô liên kết đặc trong mi dưới. <b>Liên quan:</b> chứa các tuyến sụn mi. <b>Chức năng:</b> tạo khung và giữ bờ mi dưới.',
  'tuyen le phan o mat':'<b>Vị trí:</b> hố tuyến lệ ở góc trên-ngoài ổ mắt. <b>Chức năng:</b> tiết nước mắt. <b>Liên quan:</b> cơ nâng mi trên chia tuyến lệ thành phần ổ mắt và phần mi mắt.',
  'tuyen le phan mi mat':'<b>Vị trí:</b> dưới cân cơ nâng mi trên, ở góc trên-ngoài. <b>Chức năng:</b> cùng phần ổ mắt tiết nước mắt; ống bài xuất mở vào túi kết mạc trên ngoài.',
  'co thang ngoai':'<b>Nguyên ủy:</b> vòng gân chung quanh ống thị giác. <b>Bám tận:</b> mặt ngoài củng mạc. <b>Thần kinh:</b> thần kinh vận nhãn ngoài VI. <b>Động tác:</b> dạng nhãn cầu.',
  'co thang duoi':'<b>Nguyên ủy:</b> vòng gân chung. <b>Bám tận:</b> mặt dưới-sau củng mạc. <b>Thần kinh:</b> vận nhãn III. <b>Động tác:</b> hạ, khép và xoay ngoài nhãn cầu.',
  'co cheo duoi':'<b>Nguyên ủy:</b> mặt ổ mắt xương hàm trên ở trước-trong. <b>Bám tận:</b> mặt sau-ngoài củng mạc. <b>Thần kinh:</b> vận nhãn III. <b>Động tác:</b> nâng, dạng và xoay ngoài nhãn cầu.',
  'co thang trong':'<b>Nguyên ủy:</b> vòng gân chung. <b>Bám tận:</b> mặt trong củng mạc. <b>Thần kinh:</b> vận nhãn III. <b>Động tác:</b> khép nhãn cầu.',
  'mao chau':'<b>Loại:</b> Bờ trên cánh chậu. <b>Ý nghĩa:</b> mốc sờ được qua da và là nơi bám rộng của cơ thành bụng, cơ lưng và cơ mông.',
  'gai ngoi':'<b>Loại:</b> Mốc xương chậu. <b>Liên quan:</b> nằm giữa khuyết ngồi lớn và bé; dây chằng cùng-gai bám vào đây, là mốc sản khoa quan trọng.',
  'khuyet ngoi lon':'<b>Loại:</b> Khuyết xương chậu. <b>Liên quan:</b> cùng dây chằng cùng-gai và cùng-ụ tạo lỗ ngồi lớn, đường thông giữa chậu hông và vùng mông.',
  'khuyet ngoi be':'<b>Loại:</b> Khuyết xương chậu. <b>Liên quan:</b> được dây chằng tạo thành lỗ ngồi bé, dẫn cấu trúc từ vùng mông vào tầng sinh môn.',
  'loi cu chau':'<b>Loại:</b> Mốc xương. <b>Chức năng:</b> chịu lực khi ngồi; là nguyên ủy quan trọng của nhóm cơ gân kheo.',
  'ho o coi':'<b>Loại:</b> Phần không có sụn ở trung tâm ổ cối. <b>Liên quan:</b> dây chằng chỏm xương đùi bám vào vùng này.',
  'dien nguyet':'<b>Loại:</b> Diện khớp của ổ cối. <b>Chức năng:</b> có sụn, tiếp khớp với chỏm xương đùi để tạo khớp háng.',
  'chom xdui':'<b>Loại:</b> Đầu trên xương đùi. <b>Khớp:</b> tiếp với diện nguyệt của ổ cối; hố chỏm là chỗ bám của dây chằng chỏm xương đùi.',
  'co xdui':'<b>Loại:</b> Phần nối chỏm với thân xương đùi. <b>Lâm sàng:</b> là vị trí hay gãy, có liên quan quan trọng đến cấp máu cho chỏm xương đùi.',
  'loi cu chay':'<b>Loại:</b> Mốc trước đầu trên xương chày. <b>Bám tận:</b> dây chằng bánh chè bám tại đây, truyền lực từ cơ tứ đầu đùi xuống cẳng chân.',
  'mat ca trong':'<b>Loại:</b> Mỏm đầu dưới xương chày. <b>Khớp:</b> tạo thành phần trong gọng chày-mác bao quanh ròng rọc xương sên.',
  'mat ca ngoai':'<b>Loại:</b> Đầu dưới xương mác. <b>Khớp:</b> tạo thành phần ngoài của gọng chày-mác; xuống thấp và ra sau hơn mắt cá trong.',
  'co thang':'<b>Nguyên ủy:</b> xương chẩm, dây chằng gáy và mỏm gai C7-T12. <b>Bám tận:</b> 1/3 ngoài xương đòn, mỏm cùng vai và gai vai. <b>Thần kinh:</b> thần kinh phụ (XI), cảm giác C3-C4. <b>Động tác:</b> nâng, kéo sau, hạ vai; xoay lên xương vai.',
  'co delta':'<b>Nguyên ủy:</b> 1/3 ngoài xương đòn, mỏm cùng vai và gai vai. <b>Bám tận:</b> lồi củ delta xương cánh tay. <b>Thần kinh:</b> thần kinh nách (C5-C6). <b>Động tác:</b> dạng cánh tay, nhất là từ khoảng 15° đến 90°.',
  'co tren gai':'<b>Nguyên ủy:</b> hố trên gai xương vai. <b>Bám tận:</b> diện trên củ lớn xương cánh tay. <b>Thần kinh:</b> thần kinh trên vai (C5-C6). <b>Động tác:</b> khởi đầu động tác dạng cánh tay; thuộc nhóm chóp xoay.',
  'co duoi gai':'<b>Nguyên ủy:</b> hố dưới gai xương vai. <b>Bám tận:</b> diện giữa củ lớn xương cánh tay. <b>Thần kinh:</b> thần kinh trên vai (C5-C6). <b>Động tác:</b> xoay ngoài cánh tay; thuộc chóp xoay.',
  'co duoi vai':'<b>Nguyên ủy:</b> hố dưới vai. <b>Bám tận:</b> củ bé xương cánh tay. <b>Thần kinh:</b> các thần kinh dưới vai (C5-C7). <b>Động tác:</b> xoay trong và khép cánh tay; thuộc chóp xoay.',
  'co nhi dau canh tay':'<b>Nguyên ủy:</b> đầu dài từ củ trên ổ chảo; đầu ngắn từ mỏm quạ. <b>Bám tận:</b> lồi củ quay và mạc nhị đầu. <b>Thần kinh:</b> thần kinh cơ bì (C5-C6). <b>Động tác:</b> gấp khuỷu, ngửa cẳng tay.',
  'co tam dau canh tay':'<b>Nguyên ủy:</b> đầu dài từ củ dưới ổ chảo; hai đầu còn lại từ mặt sau xương cánh tay. <b>Bám tận:</b> mỏm khuỷu xương trụ. <b>Thần kinh:</b> thần kinh quay (C6-C8). <b>Động tác:</b> duỗi cẳng tay.',
  'co canh tay':'<b>Nguyên ủy:</b> nửa dưới mặt trước xương cánh tay. <b>Bám tận:</b> mỏm vẹt và lồi củ xương trụ. <b>Thần kinh:</b> chủ yếu thần kinh cơ bì (C5-C6). <b>Động tác:</b> gấp khuỷu, hoạt động ở mọi tư thế sấp-ngửa.',
  'co qua canh tay':'<b>Nguyên ủy:</b> mỏm quạ xương vai. <b>Bám tận:</b> giữa mặt trong xương cánh tay. <b>Thần kinh:</b> thần kinh cơ bì (C5-C7). <b>Động tác:</b> gấp và khép cánh tay.',
  'co mong lon':'<b>Nguyên ủy:</b> mặt sau xương chậu, xương cùng-cụt và dây chằng cùng-ụ. <b>Bám tận:</b> dải chậu-chày và lồi củ mông xương đùi. <b>Thần kinh:</b> thần kinh mông dưới (L5-S2). <b>Động tác:</b> duỗi mạnh và xoay ngoài đùi.',
  'bung cham co cham tran':'<b>Nguyên ủy:</b> 2/3 ngoài đường gáy trên xương chẩm và vùng mỏm chũm xương thái dương. <b>Bám tận:</b> mạc trên sọ (galea aponeurotica). <b>Thần kinh:</b> nhánh tai sau của thần kinh mặt (VII). <b>Động tác:</b> kéo da đầu ra sau, hỗ trợ bụng trán nâng lông mày.',
  'bung tran co cham tran':'<b>Nguyên ủy:</b> mạc trên sọ (galea aponeurotica). <b>Bám tận:</b> da lông mày và da trán. <b>Thần kinh:</b> nhánh thái dương thần kinh mặt (VII). <b>Động tác:</b> nâng lông mày, tạo nếp nhăn ngang trán.',
  'co can':'<b>Nguyên ủy:</b> cung gò má và mặt sâu xương gò má. <b>Bám tận:</b> mặt ngoài ngành và góc xương hàm dưới. <b>Thần kinh:</b> thần kinh hàm dưới (V3). <b>Động tác:</b> nâng hàm dưới, góp phần đưa hàm ra trước.',
  'dau don co uc don chum':'<b>Nguyên ủy:</b> mặt trên đầu trong xương đòn. <b>Bám tận:</b> cùng đầu ức vào mỏm chũm và nửa ngoài đường gáy trên. <b>Thần kinh:</b> thần kinh phụ (XI), cảm giác C2-C3. <b>Động tác:</b> một bên xoay đầu sang bên đối diện; hai bên gấp cổ.',
  'dau uc co uc don chum':'<b>Nguyên ủy:</b> mặt trước cán xương ức. <b>Bám tận:</b> cùng đầu đòn vào mỏm chũm và nửa ngoài đường gáy trên. <b>Thần kinh:</b> thần kinh phụ (XI), cảm giác C2-C3. <b>Động tác:</b> một bên xoay đầu sang bên đối diện; hai bên gấp cổ.',
  'co nang vai':'<b>Nguyên ủy:</b> củ sau mỏm ngang C1 và mỏm ngang C2-C4. <b>Bám tận:</b> phần trên bờ trong xương vai, phía trên gai vai. <b>Thần kinh:</b> thần kinh vai lưng (C5) và nhánh C3-C4. <b>Động tác:</b> nâng vai, xoay xuống xương vai.',
  'co vai mong':'<b>Nguyên ủy:</b> bờ trên xương vai gần khuyết vai. <b>Bám tận:</b> xương móng qua gân trung gian. <b>Thần kinh:</b> quai cổ (C1-C3). <b>Động tác:</b> hạ và kéo sau xương móng.',
  'co uc giap':'<b>Nguyên ủy:</b> mặt sau cán xương ức và sụn sườn I. <b>Bám tận:</b> đường chéo sụn giáp. <b>Thần kinh:</b> quai cổ (C1-C3). <b>Động tác:</b> hạ thanh quản sau khi nuốt.',
  'co giap mong':'<b>Nguyên ủy:</b> đường chéo sụn giáp. <b>Bám tận:</b> thân và sừng lớn xương móng. <b>Thần kinh:</b> sợi C1 đi cùng thần kinh hạ thiệt (XII). <b>Động tác:</b> hạ xương móng hoặc nâng thanh quản.',
  'co mut':'<b>Nguyên ủy:</b> mỏm huyệt răng hàm trên-hàm dưới và dải chân bướm-hàm. <b>Bám tận:</b> góc miệng, hòa vào cơ vòng miệng. <b>Thần kinh:</b> nhánh má thần kinh mặt (VII). <b>Động tác:</b> ép má vào răng, giữ thức ăn giữa hai mặt nhai.',
  'co cuoi':'<b>Nguyên ủy:</b> mạc tuyến mang tai và mạc cơ cắn. <b>Bám tận:</b> góc miệng (modiolus). <b>Thần kinh:</b> nhánh má thần kinh mặt (VII). <b>Động tác:</b> kéo góc miệng ra ngoài khi cười.',
  'co go ma lon':'<b>Nguyên ủy:</b> mặt ngoài xương gò má. <b>Bám tận:</b> góc miệng (modiolus). <b>Thần kinh:</b> nhánh gò má và má thần kinh mặt (VII). <b>Động tác:</b> kéo góc miệng lên trên-ra ngoài.',
  'co go ma be':'<b>Nguyên ủy:</b> mặt trước xương gò má. <b>Bám tận:</b> da môi trên. <b>Thần kinh:</b> nhánh gò má và má thần kinh mặt (VII). <b>Động tác:</b> nâng môi trên.',
  'co ha goc mieng':'<b>Nguyên ủy:</b> đường chéo xương hàm dưới. <b>Bám tận:</b> góc miệng (modiolus). <b>Thần kinh:</b> nhánh bờ hàm dưới thần kinh mặt (VII). <b>Động tác:</b> kéo góc miệng xuống dưới.',
  'co cam':'<b>Nguyên ủy:</b> hố răng cửa xương hàm dưới. <b>Bám tận:</b> da cằm. <b>Thần kinh:</b> nhánh bờ hàm dưới thần kinh mặt (VII). <b>Động tác:</b> nâng và đưa môi dưới ra trước, tạo nếp da cằm.',
  'co nang moi tren':'<b>Nguyên ủy:</b> bờ dưới ổ mắt xương hàm trên. <b>Bám tận:</b> da môi trên. <b>Thần kinh:</b> nhánh gò má và má thần kinh mặt (VII). <b>Động tác:</b> nâng môi trên.',
  'phan moi co nang moi tren canh mui':'<b>Nguyên ủy:</b> mỏm trán xương hàm trên. <b>Bám tận:</b> da môi trên. <b>Thần kinh:</b> nhánh má thần kinh mặt (VII). <b>Động tác:</b> nâng môi trên.',
  'phan canh mui co nang moi tren canh mui':'<b>Nguyên ủy:</b> mỏm trán xương hàm trên. <b>Bám tận:</b> sụn cánh mũi và da cánh mũi. <b>Thần kinh:</b> nhánh má thần kinh mặt (VII). <b>Động tác:</b> nâng môi trên và làm giãn lỗ mũi.',
  'co mong nho':'<b>Nguyên ủy:</b> mặt ngoài xương cánh chậu. <b>Bám tận:</b> mặt ngoài mấu chuyển lớn. <b>Thần kinh:</b> thần kinh mông trên (L4-S1). <b>Động tác:</b> dạng, xoay trong đùi và giữ vững chậu khi đi.',
  'co hinh le':'<b>Nguyên ủy:</b> mặt trước xương cùng. <b>Bám tận:</b> bờ trên mấu chuyển lớn. <b>Thần kinh:</b> thần kinh cơ hình lê (S1-S2). <b>Động tác:</b> xoay ngoài đùi duỗi; dạng đùi gấp.',
  'co may':'<b>Nguyên ủy:</b> gai chậu trước trên. <b>Bám tận:</b> mặt trong đầu trên xương chày (chân ngỗng). <b>Thần kinh:</b> thần kinh đùi (L2-L3). <b>Động tác:</b> gấp, dạng, xoay ngoài đùi; gấp gối.',
  'co thon':'<b>Nguyên ủy:</b> ngành dưới xương mu và ngành xương ngồi. <b>Bám tận:</b> mặt trong đầu trên xương chày (chân ngỗng). <b>Thần kinh:</b> thần kinh bịt (L2-L3). <b>Động tác:</b> khép đùi, gấp gối.',
  'than kinh nach':'<b>Nguyên ủy:</b> bó sau đám rối cánh tay (C5-C6). <b>Đường đi:</b> qua lỗ tứ giác, vòng quanh cổ phẫu thuật xương cánh tay. <b>Chi phối:</b> cơ delta, cơ tròn bé và da vùng vai ngoài.',
  'than kinh quay':'<b>Nguyên ủy:</b> bó sau đám rối cánh tay (C5-T1). <b>Đường đi:</b> rãnh thần kinh quay xương cánh tay rồi ra trước mỏm trên lồi cầu ngoài. <b>Chi phối:</b> cơ duỗi cánh tay/cẳng tay; có nhánh nông cảm giác và nhánh sâu vận động.',
  'than kinh tru':'<b>Nguyên ủy:</b> bó trong đám rối cánh tay (C8-T1). <b>Đường đi:</b> sau mỏm trên lồi cầu trong, qua ống Guyon. <b>Chi phối:</b> đa số cơ nội tại bàn tay và cảm giác bờ trụ bàn tay.',
  'than kinh giua':'<b>Nguyên ủy:</b> hai rễ từ bó ngoài và bó trong (C5-T1). <b>Đường đi:</b> đi qua ống cổ tay. <b>Chi phối:</b> đa số cơ gấp cẳng tay, cơ mô cái và cảm giác lòng bàn tay phía quay.',
  'than kinh co bi':'<b>Nguyên ủy:</b> bó ngoài đám rối cánh tay (C5-C7). <b>Đường đi:</b> xuyên cơ quạ-cánh tay, đi giữa cơ nhị đầu và cơ cánh tay. <b>Chi phối:</b> nhóm gấp cánh tay; tận cùng là thần kinh bì cẳng tay ngoài.',
  'than kinh dui':'<b>Nguyên ủy:</b> đám rối thắt lưng (L2-L4). <b>Đường đi:</b> dưới dây chằng bẹn, vào tam giác đùi. <b>Chi phối:</b> nhóm cơ trước đùi; cảm giác mặt trước đùi và qua thần kinh hiển đến cẳng chân trong.',
  'than kinh bit':'<b>Nguyên ủy:</b> đám rối thắt lưng (L2-L4). <b>Đường đi:</b> qua ống bịt. <b>Chi phối:</b> chủ yếu nhóm cơ khép đùi và cảm giác một vùng nhỏ mặt trong đùi.',
  'than kinh hong toa':'<b>Nguyên ủy:</b> đám rối cùng (L4-S3). <b>Đường đi:</b> rời chậu qua lỗ ngồi lớn, thường dưới cơ hình lê. <b>Chi phối:</b> vận động phần lớn cẳng chân-bàn chân qua các nhánh chày và mác chung.',
  'dong mach dui':'<b>Nguyên ủy:</b> tiếp nối động mạch chậu ngoài dưới dây chằng bẹn. <b>Đường đi:</b> trong tam giác đùi và ống cơ khép; sau đó trở thành động mạch khoeo. <b>Ý nghĩa:</b> mạch chính cấp máu chi dưới.',
  'dong mach nach':'<b>Nguyên ủy:</b> tiếp nối động mạch dưới đòn tại bờ ngoài xương sườn I. <b>Đường đi:</b> qua hố nách, đến bờ dưới cơ tròn lớn thì thành động mạch cánh tay.'
};

function studyNote(q){
  // Khóa dữ kiện được viết dễ đọc (có khoảng trắng), còn đáp án có thể có viết tắt/dấu câu.
  // Vì vậy luôn so khớp cả hai phía theo dạng chuẩn hóa thay vì truy cập khóa trực tiếp.
  const exact = Object.entries(STUDY_NOTES).find(([key]) => norm(key) === norm(q.answer))?.[1];
  if(exact) return exact;
  const name = q.answer;
  if(/^cơ\b/i.test(name)) return `<b>Loại:</b> Cơ vân. <b>Ôn thực hành:</b> xác định vị trí, hướng thớ cơ và mốc bám trên hình; thông tin nguyên ủy-bám tận chỉ hiển thị khi đã có thẻ dữ kiện kiểm chứng để tránh học nhầm.`;
  if(/thần kinh|^tk\b/i.test(name)) return `<b>Loại:</b> Thần kinh ngoại biên. <b>Ôn thực hành:</b> xác định đường đi giữa các mốc, nhánh tận và vùng vận động/cảm giác; không tự gán vùng chi phối khi chưa có dữ kiện kiểm chứng.`;
  if(/động mạch|^đm\b|tĩnh mạch|^tm\b/i.test(name)) return `<b>Loại:</b> Mạch máu. <b>Ôn thực hành:</b> nhớ nguồn gốc, đường đi và mốc nơi mạch đổi tên hoặc cho nhánh; đối chiếu mạch với thần kinh đi kèm trên tiêu bản.`;
  if(/dây chằng|^dc\b/i.test(name)) return `<b>Loại:</b> Dây chằng. <b>Ôn thực hành:</b> xác định hai điểm bám xương và vai trò giữ vững khớp; không suy diễn điểm bám nếu chưa có thẻ kiểm chứng.`;
  return `<b>Loại:</b> Chi tiết giải phẫu thuộc ${q.topic.toLowerCase()}. <b>Ôn thực hành:</b> nhận diện theo hình dạng, vị trí tương quan và mốc lân cận; đây là cách an toàn nhất để phân biệt các chi tiết cùng vùng.`;
}

function unique(a){ return [...new Set(a)]; }
function shuffle(a){ return [...a].sort(() => Math.random() - .5); }
function topicOptions(){ return ['Tất cả', ...unique(QUESTION_BANK.map(q => q.topic))]; }
function resetPool(keepReview=false){
  const source = keepReview ? QUESTION_BANK.filter(q => saved.mistakes.includes(key(q))) : QUESTION_BANK.filter(q => state.topic === 'Tất cả' || q.topic === state.topic);
  state.pool = shuffle(source.length ? source : QUESTION_BANK); state.index=0; state.selected=null; state.checked=false;
}
function key(q){ return `${q.image}:${q.n}`; }
function current(){ return state.pool[state.index % state.pool.length]; }
function renderOptions(q){
  const area = $('#answerArea'); area.innerHTML='';
  if(state.mode==='typing'){
    area.innerHTML = `<label class="typing-label" for="typedAnswer">Tên chi tiết giải phẫu</label><input id="typedAnswer" class="typing-input" autocomplete="off" placeholder="Nhập câu trả lời của bạn..." /><small class="answer-hint">Chấp nhận viết tắt: DC/dây chằng, TK/thần kinh, ĐM/động mạch, TM/tĩnh mạch, x./xương.</small>`;
    $('#typedAnswer').addEventListener('input', e => { state.selected=e.target.value; $('#submitBtn').disabled=!e.target.value.trim(); });
  }else{
    const wrong=shuffle(QUESTION_BANK.filter(x=>x.answer!==q.answer).map(x=>x.answer)).slice(0,3);
    shuffle([q.answer,...wrong]).forEach((opt,i)=>{
      const btn=document.createElement('button'); btn.className='option'; btn.dataset.answer=opt; btn.innerHTML=`<span>${i+1}</span>${opt}`;
      btn.onclick=()=>{if(state.checked)return; state.selected=opt; document.querySelectorAll('.option').forEach(b=>b.classList.toggle('selected',b===btn)); $('#submitBtn').disabled=false;}; area.appendChild(btn);
    });
  }
}
function render(){
  const q=current(); if(!q) return;
  $('#anatomyImage').src=q.image; $('#zoomImage').src=q.image; $('#topicBadge').textContent=q.topic; $('#targetNumber').textContent=q.n;
  $('#questionCount').textContent=`Câu ${state.index+1} / ${state.pool.length}`;
  $('#prompt').innerHTML=`Chi tiết được mũi tên số <mark>${q.n}</mark> chỉ vào là gì?`;
  $('#difficultyDots').textContent='●'.repeat(q.difficulty)+'○'.repeat(3-q.difficulty);
  $('#submitBtn').disabled=true; $('#submitBtn').textContent='Kiểm tra đáp án →'; $('#feedback').className='feedback hidden'; state.selected=null; state.checked=false;
  renderOptions(q); updateStats();
}
function isCorrect(q,value){
  const answer = medicalNorm(value);
  return [q.answer,...q.aliases].some(x=>medicalNorm(x)===answer);
}
function updateProgress(correct,q){
  saved.attempts++; if(correct){ saved.correct++; saved.mistakes=saved.mistakes.filter(x=>x!==key(q)); } else if(!saved.mistakes.includes(key(q))) saved.mistakes.push(key(q));
}
function check(){
  const q=current(); if(!state.selected || state.checked) return; state.checked=true; const yes=isCorrect(q,state.selected); state.attempts++; if(yes){state.correct++; state.sessionCorrect++;}
  updateProgress(yes,q); $('#submitBtn').disabled=true;
  document.querySelectorAll('.option').forEach(b=>{ const right=b.dataset.answer===q.answer; b.classList.toggle('right',right); if(b.classList.contains('selected')&&!right)b.classList.add('wrong'); b.disabled=true; });
  const feedback=$('#feedback'); feedback.className=`feedback ${yes?'success':'error'}`;
  feedback.innerHTML=`<div class="feedback-icon">${yes?'✓':'!'}</div><div class="feedback-body"><p class="feedback-title">${yes?'Chính xác! Bạn nhận diện rất tốt.':'Chưa đúng, hãy ghi nhớ mốc này.'}</p><p>${yes?'Đáp án chính xác là':'Đáp án đúng:'} <strong>${q.answer}</strong></p><div class="fact"><span>💡</span><p>${studyNote(q)}</p></div><p class="source-note">Đối chiếu: hình trang ${q.sourceImagePage ?? '—'} → bảng nhãn trang ${q.sourceAnswerPage ?? '—'} của tài liệu thực hành.</p><div class="feedback-actions"><button id="retryBtn" class="secondary-btn">↻ Làm lại</button><button id="nextBtn" class="primary-btn">Câu tiếp theo <span>→</span></button></div></div>`;
  feedback.scrollIntoView({behavior:'smooth',block:'nearest'}); updateStats();
}
function next(){ state.index=(state.index+1)%state.pool.length; render(); window.scrollTo({top:0,behavior:'smooth'}); }
function updateStats(){ $('#totalCorrect').textContent=saved.correct; $('#streakValue').textContent=state.sessionCorrect; $('#accuracyValue').textContent=saved.attempts?`${Math.round(saved.correct/saved.attempts*100)}%`:'—'; $('#mistakeCount').textContent=saved.mistakes.length; $('#reviewText').textContent=saved.mistakes.length?`Bạn đang có ${saved.mistakes.length} câu cần ôn lại trong phiên này.`:'Tuyệt vời! Chưa có câu nào cần ôn lại trong phiên này.'; }

function init(){
  const select=$('#topicSelect'); topicOptions().forEach(t=>select.add(new Option(t,t))); select.value=state.topic;
  select.onchange=()=>{state.topic=select.value; resetPool(); render();};
  document.querySelectorAll('.mode').forEach(btn=>btn.onclick=()=>{state.mode=btn.dataset.mode; document.querySelectorAll('.mode').forEach(x=>{const on=x===btn;x.classList.toggle('active',on);x.setAttribute('aria-selected',on);}); render();});
  document.querySelectorAll('.mode').forEach(x=>{const on=x.dataset.mode===state.mode;x.classList.toggle('active',on);x.setAttribute('aria-selected',on);});
  $('#shuffleBtn').onclick=()=>{resetPool();render();}; $('#submitBtn').onclick=check;
  $('#feedback').onclick=(e)=>{if(e.target.closest('#nextBtn'))next(); if(e.target.closest('#retryBtn'))render();};
  $('#reviewBtn').onclick=()=>{resetPool(true);render();}; $('#anatomyImage').onclick=()=>$('#imageDialog').showModal(); $('#closeDialog').onclick=()=>$('#imageDialog').close();
  document.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!state.checked){e.preventDefault();check();} if(state.mode==='choice' && /^[1-4]$/.test(e.key)&&!state.checked){const opts=[...document.querySelectorAll('.option')];opts[+e.key-1]?.click();} });
  resetPool(); render();
}
init();
