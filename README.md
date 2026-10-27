# Virtual Office

สำนักงานจำลองสำหรับ Claude Code: Claude เป็นผู้จัดการ แตกงานแล้วจ่ายให้ subagent ตามตำแหน่ง (กราฟิก เอกสาร วิเคราะห์ข้อมูล นักพัฒนา พนักงานทั่วไป) และหน้าเว็บแสดงแบบสดว่าใครกำลังทำอะไร

## ใช้งาน

ต้องใช้ [Claude Code](https://claude.com/claude-code) (แท็บ Code ในแอป Claude หรือ CLI) และ Node.js 20.11 ขึ้นไป ไม่ต้อง `npm install` เพราะไม่มี dependency ยังไม่ได้ทดสอบบน Cowork

```bash
npm start
```

เปิด http://localhost:3000 แล้วเปิด Claude Code ในโฟลเดอร์นี้ hooks ใน `.claude/settings.json` จะส่งเหตุการณ์มาที่ server ผลงานเก็บใน `workspace/`

- ตำแหน่งพนักงาน: `.claude/agents/*.md`
- กฎการจ่ายงาน: `CLAUDE.md` (แก้ชื่อหน่วยงานในหัวข้อ Organization ให้เป็นของคุณ)
