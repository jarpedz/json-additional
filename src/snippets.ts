export const sqlData = {
  report: [
    {
      title: "สรุป พยาบาล กด Endchart (สามเงา)",
      query: `SELECT DISTINCT
  tradmit.visitId
 ,trVisit.hn
 , trVisit.an
 , syuser.name as nurseendchart
 , msPatient.title
 , msPatient.fname
 , msPatient.lname
--  , trVisit.visitdatetime
 , trVisit.dischargeDatetime AS วันจำหน่าย
 , syworkflowactivity.startTimeActivity as endcharttime
--  , DATEDIFF(NOW(), trVisit.dischargeDatetime) waitDate
FROM syWorkflowactivity
LEFT JOIN (select * from  syTransactionstatus where module = 'Flow') AS transactionstatus on syWorkflowactivity.activityStatusCode = transactionstatus.statusCode
LEFT JOIN (SELECT * FROM trVisit WHERE trVisit.active = 'Y') AS trVisit ON syWorkflowactivity.refId = trVisit.visitId
INNER JOIN syWorkFlowActivityMaster on syWorkFlowActivityMaster.workFlowActivityMasterId = syWorkflowactivity.workFlowActivityMasterId
LEFT JOIN msPatient on trVisit.hn = msPatient.hn
INNER JOIN syflowstepconfig on syWorkflowactivity.flowStepConfigId = syflowstepconfig.flowStepConfigId
INNER JOIN msRoom on msRoom.roomno = syWorkFlowActivityMaster.roomno
LEFT JOIN trvisitinformation ON trvisitinformation.visitId = trVisit.visitId
INNER JOIN syuserroom on syuserroom.roomno = syWorkFlowActivityMaster.roomno
LEFT JOIN tradmit on tradmit.visitId = trvisit.visitId
LEFT JOIN syUser on syworkflowactivity.usernameActivity = syUser.username
-- LEFT JOIN syUser on tradmit.doctorcode = syUser.username
-- LEFT JOIN syUser on syworkflowactivity.usernameActivity = syuser.username
WHERE (isCurrent = 'Y')
AND tradmit.status='WAIT_CLOSE'
AND tradmit.doctorcode is not null
AND trVisit.walkinType = 'IPD'
AND (syWorkflowactivity.roleId= '5' OR syWorkflowactivity.roleId= '102')
AND syWorkFlowActivityMaster.roomno = 'DC_Nurse'
AND (syWorkflowactivity.activityStatusCode = 'DONE')
AND trvisit.dischargeDatetime BETWEEN '2026-01-01' AND '2026-01-31';
-- and DATE_FORMAT(trvisit.createdate,"%y%m") BETWEEN '2405'and '2405'
ORDER BY dischargeDatetime
      `,
    },
    {
      title: "รายงานที่ยังไม่ได้บันทึก dcsum  รพ.จตร",
      query: `SELECT trvisit.visitId
,trvisit.hn
,trvisit.an
, CONCAT( mspatient.title,' ',mspatient.fname,' ',mspatient.lname ) AS Name_patient
,trvisit.admitDate
,trvisit.admitInDatetime
,trvisit.dischargeDatetime
,CONCAT('Dr. ', syuser.name) AS Doctor_Name
,tradmit.doctorcode
,tradmit.wardId
,syworkflowactivity.activityStatusCode
,trvisitdiagnosis.icd10
,trvisitdiagnosis.diagnosisname
,trvisitdiagnosis.doctordiagnosis
,CASE
    WHEN trvisitdiagnosis.icd10 IS NOT NULL
      OR trvisitdiagnosis.diagnosisname IS NOT NULL
      OR trvisitdiagnosis.doctordiagnosis IS NOT NULL
    THEN 'สรุปชาร์ตแล้ว'
    ELSE 'ยังไม่สรุป'
 END AS chart_status
FROM trvisit
LEFT JOIN syworkflowactivity on syworkflowactivity.refId = trvisit.visitId
LEFT JOIN msPatient on trVisit.hn = msPatient.hn
LEFT JOIN tradmit on trVisit.an = tradmit.an
LEFT JOIN syuser ON tradmit.doctorcode = syuser.doctorcode
LEFT JOIN trvisitdiagnosis ON trvisit.visitId = trvisitdiagnosis.visitId  AND trvisitdiagnosis.active = 'Y' AND trvisitdiagnosis.formType = 'DC Summary' AND trvisitdiagnosis.diagnosisType ='Principal Diagnosis'
WHERE trvisit.active = 'Y'
AND tradmit.status = 'WAIT_CLOSE'
AND syworkflowactivity.flowConfigId ='14' and syworkflowactivity.activityStatusCode = 'RECHECK_REVIEW'
AND trvisit.admitDate BETWEEN '2025-09-01 00:00:00' and '2025-12-31 23:59:59'
-- AND trvisit.visitId = '680105182933'

GROUP BY trvisit.visitId, trvisit.admitDate
-- HAVING chart_status = 'ยังไม่สรุป'
-- HAVING chart_status = 'สรุปชาร์ตแล้ว'
ORDER BY tradmit.doctorcode
        `,
    },
    {
      title: "ยอด MR เภสัชและหมอ กุฉินาราย",
      query: `WITH base_admit AS (
    SELECT
        adm.hn,
        adm.an,
        adm.visitid,
        vst.admitDate,
        vst.dischargeDatetime
    FROM (
        SELECT *
        FROM tradmit a
        WHERE a.seq = (
            SELECT MAX(b.seq)
            FROM tradmit b
            WHERE b.visitid = a.visitid
              AND b.hn = a.hn
              AND b.an = a.an
        )
    ) adm
    LEFT JOIN trvisit vst
        ON adm.visitid = vst.visitid
    WHERE YEAR(vst.admitDate) = 2025

),

mr_send AS (
    SELECT
        visitId,
        MIN(sendConsultDate) AS first_send_date
    FROM trreconcile
    WHERE sendConsultBy IS NOT NULL
    GROUP BY visitId
),

mr_receive AS (
    SELECT
        visitId,
        MIN(receiveDate) AS first_receive_date
    FROM trreconcile
    WHERE receiveBy IS NOT NULL
    GROUP BY visitId
)

SELECT
    DATE_FORMAT(b.admitDate, '%Y-%m') AS admit_month,

    /* 1. จำนวนผู้ป่วยทั้งหมด (By AN) */
    COUNT(DISTINCT b.an) AS total_patient,

    /* 2. เภสัชกดสั่ง MR */
    COUNT(DISTINCT CASE
        WHEN ms.visitId IS NOT NULL THEN b.an
    END) AS pharmacist_mr_send_patient,

    /* 3. แพทย์กดรับ MR */
    COUNT(DISTINCT CASE
        WHEN mr.visitId IS NOT NULL THEN b.an
    END) AS doctor_mr_receive_patient,

    /* 4. แพทย์กดรับ MR ภายใน 24 ชม. หลัง Admit */
    COUNT(DISTINCT CASE
        WHEN mr.first_receive_date IS NOT NULL
         AND TIMESTAMPDIFF(
                HOUR,
                b.admitDate,
                mr.first_receive_date
             ) < 24
        THEN b.an
    END) AS doctor_mr_receive_within_24hr

FROM base_admit b
LEFT JOIN mr_send ms
    ON b.visitid = ms.visitId
LEFT JOIN mr_receive mr
    ON b.visitid = mr.visitId

GROUP BY DATE_FORMAT(b.admitDate, '%Y-%m');`,
    },
    {
      title: "ข้อมูลผู้ป่วยที่ D/C **โพธิ์ศรีสุวรรณ",
      query: `SELECT trvisit.visitId
    ,trvisit.hn
    ,trvisit.an
    ,CONCAT(mspatient.title,' ',mspatient.fname,' ',mspatient.lname) AS Name_patient
    ,trvisit.admitDate
    ,trvisit.admitInDatetime
    ,trvisit.dischargeDatetime
FROM trvisit
LEFT JOIN msPatient
    ON trVisit.hn = msPatient.hn
LEFT JOIN tradmit
    ON trVisit.an = tradmit.an
WHERE trvisit.active = 'Y'
AND trvisit.dischargeDatetime BETWEEN '2025-12-01 00:00:00' AND '2025-12-31 23:59:59'
GROUP BY trvisit.visitId;
        `,
    },
    {
      title: "กงหรา chart day",
      query: `SELECT
    trvisit.visitId,
    trvisit.hn,
    trvisit.an,
    CONCAT(mspatient.title, ' ', mspatient.fname, ' ', mspatient.lname) AS Name_patient,
    trvisit.admitDate,
    trvisit.admitInDatetime,
    trvisit.dischargeDatetime,
    CONCAT('Dr. ', syuser.name) AS Doctor_Name,
    tradmit.doctorcode,
    msroom.roomname,
    swa14.activityStatusCode,
    swa14.remarkProcess,
    TIMESTAMPDIFF(DAY, trvisit.dischargeDatetime, NOW()) AS Chart_Days
FROM trvisit
LEFT JOIN msPatient ON trVisit.hn = msPatient.hn
LEFT JOIN tradmit ON trVisit.an = tradmit.an
LEFT JOIN syuser ON tradmit.doctorcode = syuser.doctorcode
LEFT JOIN msroom ON tradmit.roomno = msroom.roomno
LEFT JOIN syworkflowactivity swa14
  ON swa14.refId = trvisit.visitId AND swa14.flowConfigId = '14'
LEFT JOIN syworkflowactivity swa18
  ON swa18.refId = trvisit.visitId AND swa18.flowConfigId = '18'
WHERE trvisit.active = 'Y'
  AND trVisit.walkinType = 'IPD'
  AND tradmit.doctorcode IS NOT NULL
  AND tradmit.status IN ('WAIT_CLOSE')
  AND swa14.activityStatusCode = 'RECHECK_REVIEW'
  AND swa18.refId IS NULL
GROUP BY trvisit.an
ORDER BY Chart_Days DESC;
        `,
    },
    {
      title: "รายงานผู้ป่วยได้รับการประเมิน SOS score",
      query: `select
  trvisit.visitId,
 trvisit.hn,
 trvisit.an,
 CONCAT_WS(' ',mspatient.title,mspatient.fname,mspatient.lname) as patient_name,
 ROW_NUMBER() OVER (PARTITION BY trsosscore.visitId ORDER BY trsosscore.updateDate ASC) AS 'ลำดับ sos_score',
  trsosscore.consciousness,
  trsosscore.temperature,
  trsosscore.pr,
  trsosscore.rr,
 trsosscore.sbp,
  urineOutput1 as 'ปัสสาวะ/ 1 ชม.',
 urineOutput2 as 'ปัสสาวะ/ 4 ชม.',
  urineOutput3 as 'ปัสสาวะ/ 8 ชม.',
 breathMachine as 'ใช้เครื่องช่วยหายใจ',
 vasopressor as 'ใช้ยากระตุ้นความดัน',
 note,

  (
    CASE
      WHEN consciousness = 'ตื่นดี พูดคุยรู้เรื่อง' THEN 0
      WHEN consciousness = 'ซึมเรียกลืมตา' THEN 1
      WHEN consciousness = 'ซึมมาก กระตุ้นลืมตา' THEN 2
      WHEN consciousness = 'ไม่รู้สึกตัว' THEN 3
      WHEN consciousness = 'สับสน กระสับกระส่าย' THEN 1
      ELSE 0
    END +
    CASE
      WHEN temperature < 35.1 THEN 2
      WHEN temperature BETWEEN 35.1 AND 36.0 THEN 1
      WHEN temperature BETWEEN 36.1 AND 38.0 THEN 0
      WHEN temperature BETWEEN 38.1 AND 38.5 THEN 1
      WHEN temperature > 38.5 THEN 2
      ELSE 0
    END +
    CASE
      WHEN trsosscore.pr < 41 THEN 3
      WHEN trsosscore.pr BETWEEN 41 AND 50 THEN 1
      WHEN trsosscore.pr BETWEEN 51 AND 100 THEN 0
      WHEN trsosscore.pr BETWEEN 101 AND 120 THEN 1
      WHEN trsosscore.pr BETWEEN 121 AND 139 THEN 2
      WHEN trsosscore.pr >= 140 THEN 3
      ELSE 0
    END +
    CASE
      WHEN breathMachine = 'Y' THEN 2
      WHEN trsosscore.rr < 9 THEN 3
      WHEN trsosscore.rr BETWEEN 9 AND 20 THEN 0
      WHEN trsosscore.rr BETWEEN 21 AND 25 THEN 1
      WHEN trsosscore.rr BETWEEN 26 AND 35 THEN 2
      WHEN trsosscore.rr > 35 THEN 3
      ELSE 0
    END +
    CASE
      WHEN vasopressor = 'Y' THEN 3
      WHEN sbp < 81 THEN 3
      WHEN sbp BETWEEN 81 AND 90 THEN 2
      WHEN sbp BETWEEN 91 AND 100 THEN 1
      WHEN sbp BETWEEN 101 AND 180 THEN 0
      WHEN sbp BETWEEN 181 AND 199 THEN 1
      WHEN sbp > 199 THEN 2
      ELSE 0
    END +
    CASE
      WHEN urineOutput1 >= 40 THEN 0
      WHEN urineOutput1 BETWEEN 21 AND 39 THEN 1
      WHEN urineOutput1 <= 20 THEN 2
      ELSE 0
    END +
    CASE
      WHEN urineOutput2 >= 160 THEN 0
      WHEN urineOutput2 BETWEEN 81 AND 159 THEN 1
      WHEN urineOutput2 <= 80 THEN 2
      ELSE 0
    END +
    CASE
      WHEN urineOutput3 >= 320 THEN 0
      WHEN urineOutput3 BETWEEN 161 AND 319 THEN 1
      WHEN urineOutput3 <= 160 THEN 2
      ELSE 0
    END
  ) AS total_sosscore,
 CASE WHEN trsosscore.updatedBy is not null THEN trsosscore.updatedBy ELSE trsosscore.createdBy END AS sosscore_by,
 trsosscore.updateDate as sosscore_datetime
 FROM trsosscore
LEFT JOIN trvisit ON trsosscore.visitId = trvisit.visitId
LEFT JOIN mspatient ON trvisit.hn = mspatient.hn
WHERE trsosscore.active = 'Y' AND DATE(trvisit.admitInDatetime) between '2025-10-01' AND '2025-12-06'
        `,
    },
    {
      title:
        "เภสัชเก็บข้อมูลระยะเวลาการให้ยา stat ตั้งแต่แพทย์สั่งใช้ยาถึงพยาบาลให้ยา ภายในระยะเวลา 30 นาที (คลองขลุง)",
      query: `SELECT
    ti.orderItemId,
    ti.itemcode,
  ti.itemname,
    ti.itemtype,
    ti.orderFeature,
    ti.orderType,
    ti.status,
    MIN(CASE WHEN tis.status = 'New' THEN tis.createDate END) AS time_new,
    MIN(CASE WHEN tis.status = 'Order' THEN tis.createDate END) AS time_order,
    MIN(CASE WHEN tis.status = 'ConfirmOrder' THEN tis.createDate END) AS time_confirm,
    MIN(CASE WHEN tis.status = 'CheckedOut' THEN tis.createDate END) AS time_checkedout,
    MIN(CASE WHEN tk.status = 'EMAR' THEN tk.emarDate END) AS emar_first_datetime,
    TIMESTAMPDIFF(
      MINUTE,
        COALESCE(
        MIN(CASE WHEN tis.status = 'New' THEN tis.createDate END),
        MIN(CASE WHEN tis.status = 'Order' THEN tis.createDate END)
    ),
    MIN(CASE WHEN tk.status = 'EMAR' THEN tk.emarDate END)
) AS diff_new_to_emar_min,
   CASE
    WHEN MIN(CASE WHEN tk.status = 'EMAR' THEN tk.emarDate END) IS NULL
        THEN  'ไม่มีการกดให้ยา'

    WHEN TIMESTAMPDIFF(
            MINUTE,
            MIN(CASE WHEN tis.status = 'New' THEN tis.createDate END),
            MIN(CASE WHEN tk.status = 'EMAR' THEN tk.emarDate END)
        ) > 30
        THEN 'Over 30 min'

    ELSE 'Within 30 min'
    END AS check_30min,
    t.orderId,
    CONCAT(mp.fname , " " , mp.lname) AS patientName,
    mr.ward,
    t.hn,
    t.visitId,
    tv.an
FROM trorderitem ti
LEFT JOIN trorderitemstatus tis ON ti.orderItemId = tis.orderItemId
LEFT JOIN trorderitemplan tip ON ti.orderItemId = tip.orderItemId
LEFT JOIN trkardex tk ON tip.orderItemPlanId = tk.orderItemPlanId
LEFT JOIN trorder t on ti.orderId = t.orderId
LEFT JOIN trvisit tv on t.visitId = tv.visitId
LEFT JOIN mspatient mp on t.hn = mp.hn
LEFT JOIN tradmit tm on tv.visitId = tm.visitId
LEFT JOIN msroom mr on tm.roomno = mr.roomno
WHERE ti.orderFeature = 'Urgent' and ti.active = 'Y'
and ti.orderitemIdSummary IS NULL
and ti.itemtype in ('Drug','IV Fuild')
and t.orderId IS NOT NULL
AND tm.status IN ("WAIT_CLOSE","CLOSE","CURRENT")
AND tis.createDate BETWEEN '2025-10-01 00:00:00' and '2026-04-30 23:59:59'
-- and ti.orderId = '250912018359'
GROUP BY ti.orderItemId
ORDER BY tv.visitId , tis.createDate
-- // เวลา พยบ กด ให้ยา`,
    },
    {
      title: " รีพอตจำนวนการใช้ยาแต่ละตัว อู่ทอง",
      query: `SELECT
    d.itemname,
    SUM(d.qty) AS total_qty
FROM trdrugorder d
INNER JOIN trorderitem o
    ON o.orderItemId = d.drugOrderId
WHERE d.itemcode IN ('1540083','1660071','1560119','1901227','1521063','1901378')
  AND d.status NOT IN ('Off','Cancel')
  AND o.statusReturnToHis IS NOT NULL
  AND d.updateDate >= '2025-12-01'
  AND d.updateDate <  '2026-01-01'
GROUP BY d.itemname;`,
    },
    {
      title: "รายงาน med reconcil  เวลาที่เภสัชกรทำreconcil  และ differintime",
      query: `SELECT trorder.visitId,
trvisit.admitInDatetime,
trreconcile.createDate
as start ,trorderitem.updateDate
as end, TIMEDIFF(trorderitem.updateDate,trreconcile.createDate)as differintime FROM trorderitem
LEFT JOIN trorder on trorderitem.orderId = trorder.orderId
LEFT JOIN trvisit on trvisit.visitId = trorder.visitId
LEFT JOIN trreconcile on trvisit.visitId = trreconcile.visitId
WHERE trorderitem.reconcileId is not null  and DATE_FORMAT(trorderitem.createdate,"%y%m") BETWEEN '2506'and '2508'  and trorderitem.status ='CheckedOut' and TIMEDIFF(trorderitem.updateDate,trorderitem.createDate) > '24:00:00' GROUP BY trorderitem.orderId;

SELECT trorder.visitId,
trvisit.admitInDatetime,
trreconcile.createDate as start,
trorderitem.updateDate as end,
TIMEDIFF(trorderitem.updateDate,trreconcile.createDate)as differintime FROM trorderitem
LEFT JOIN trorder on trorderitem.orderId = trorder.orderId
LEFT JOIN trvisit on trvisit.visitId = trorder.visitId
LEFT JOIN trreconcile on trvisit.visitId = trreconcile.visitId
WHERE trorderitem.reconcileId is not null  and DATE_FORMAT(trorderitem.createdate,"%y%m") BETWEEN '2506'and '2508' and trorderitem.status ='CheckedOut' and TIMEDIFF(trorderitem.updateDate,trorderitem.createDate) < '24:00:00' GROUP BY trorderitem.orderId;
      `,
    },
    {
      title: "จำแนกผู้ป่วยแยกกะ",
      query: `SELECT
    t_latest.visitId,
    t_latest.an,
    t_latest.hn,
    CONCAT(p.title,' ',p.fname,' ',p.lname) as patient_name,
    t_latest.bedno,
    DATE(t_latest.admitDate) as admitDate,
    t_latest.indatetime,
    t_latest.outdatetime,
    t_latest.ward,
    t_latest.roomno,
    t_latest.doctorcode,
    u.name as doctorname,
    f_latest.result,
    f_latest.activeDate as result_date,
  f_latest.createdBy as result_by,
    CASE
        WHEN TIME(f_latest.activeDate) BETWEEN '08:00:00' AND '15:59:59' THEN 'Morning'
        WHEN TIME(f_latest.activeDate) BETWEEN '16:00:00' AND '23:59:59' THEN 'Evening'
        WHEN TIME(f_latest.activeDate) BETWEEN '00:00:00' AND '07:59:59' THEN 'Night'
        ELSE NULL
    END AS shift
FROM
    (SELECT *
     FROM tradmit t
     WHERE DATE(t.admitDate) BETWEEN '2024-06-01' AND '2024-10-01'
       AND t.seq = (
           SELECT MAX(seq)
           FROM tradmit
           WHERE visitid = t.visitid AND t.bedno is not null
       )
    ) AS t_latest
LEFT JOIN
    (SELECT *
     FROM frmtrassessmentresult AS f
     WHERE refId = (
         SELECT MAX(refId)
         FROM frmtrassessmentresult
         WHERE visitid = f.visitid AND active = 'Y'
     )) AS f_latest
ON
    t_latest.visitid = f_latest.visitid
LEFT JOIN syuser u on t_latest.doctorcode = u.username
LEFT JOIN mspatient p on t_latest.hn = p.hn
ORDER BY t_latest.admitDate, t_latest.ward ASC;

-- ค่า pressure ฟอร์มปรอท

SELECT
    adm.hn,
    adm.an,
    adm.visitid AS vn,
    CONCAT(pt.title, ' ', pt.fname, ' ', pt.lname) AS ptname,
    adm.admitDate,
    vst.dischargeDatetime AS dischargeDate,
  pp.Q1,
  pp.Q2,
  pp.Q3,
  pp.Q4,
  pp.Q5,
  pp.Q6,
    pp.Score AS score,
  pp.status,
  pp.CreateBy as PreasureBy,
  pp.CreateDate AS PreasureDate,
  CASE
        WHEN TIME(pp.CreateDate) BETWEEN '08:00:00' AND '15:59:59' THEN 'Morning'
        WHEN TIME(pp.CreateDate) BETWEEN '16:00:00' AND '23:59:59' THEN 'Evening'
        WHEN TIME(pp.CreateDate) BETWEEN '00:00:00' AND '07:59:59' THEN 'Night'
        ELSE NULL
    END AS shift
FROM (
    --  เลือก an status ล่าสุด
    SELECT *
    FROM tradmit AS a
    WHERE a.seq = (
        SELECT MAX(b.seq)
        FROM tradmit b
        WHERE b.visitid = a.visitid
          AND b.hn = a.hn
          AND b.an = a.an
    )
) AS adm
LEFT JOIN trvisit AS vst ON adm.visitid = vst.visitid
LEFT JOIN mspatient AS pt ON adm.hn = pt.hn
INNER JOIN (
    --  เลือก bardenscore ล่าสุด
    SELECT *
    FROM frmtrpnpressure AS x
    WHERE x.trIPDTemp_PSR_ID = (
        SELECT MAX(y.trIPDTemp_PSR_ID)
        FROM frmtrpnpressure y
        WHERE y.visitid = x.visitid
    )
) AS pp ON adm.visitid = pp.visitid
WHERE DATE(adm.admitDate) BETWEEN '2024-10-01' AND '2025-01-31' ;-- วันที่admit
        `,
    },
    {
      title:
        "รอการสรุปชาร์ตของแพทย์  หรือยังไม่มี PrincipleDiag   / โดยแยกตามรายชื่อแพทย์  ฉวาง",
      query: `SELECT trvisit.visitId
,trvisit.hn
,trvisit.an
, CONCAT( mspatient.title,' ',mspatient.fname,' ',mspatient.lname ) AS Name_patient
,trvisit.admitDate
,trvisit.admitInDatetime
,trvisit.dischargeDatetime
,CONCAT('Dr. ', syuser.name) AS Doctor_Name
,tradmit.doctorcode
,tradmit.wardId
,syworkflowactivity.activityStatusCode
,trvisitdiagnosis.icd10
,trvisitdiagnosis.diagnosisname
,trvisitdiagnosis.doctordiagnosis
,CASE
    WHEN trvisitdiagnosis.icd10 IS NOT NULL
      OR trvisitdiagnosis.diagnosisname IS NOT NULL
      OR trvisitdiagnosis.doctordiagnosis IS NOT NULL
    THEN 'สรุปชาร์ตแล้ว'
    ELSE 'ยังไม่สรุป'
 END AS chart_status
FROM trvisit
LEFT JOIN syworkflowactivity on syworkflowactivity.refId = trvisit.visitId
LEFT JOIN msPatient on trVisit.hn = msPatient.hn
LEFT JOIN tradmit on trVisit.an = tradmit.an
LEFT JOIN syuser ON tradmit.doctorcode = syuser.doctorcode
LEFT JOIN trvisitdiagnosis ON trvisit.visitId = trvisitdiagnosis.visitId  AND trvisitdiagnosis.active = 'Y' AND trvisitdiagnosis.formType = 'DC Summary' AND trvisitdiagnosis.diagnosisType ='Principal Diagnosis'
WHERE trvisit.active = 'Y'
AND tradmit.status = 'WAIT_CLOSE'
AND syworkflowactivity.flowConfigId ='14' and syworkflowactivity.activityStatusCode = 'RECHECK_REVIEW'
AND trvisit.admitDate BETWEEN '2025-01-01 00:00:00' and '2025-01-31 23:59:59'
-- AND trvisit.visitId = '680105182933'

GROUP BY trvisit.visitId, trvisit.admitDate
-- HAVING chart_status = 'ยังไม่สรุป'
-- HAVING chart_status = 'สรุปชาร์ตแล้ว'
ORDER BY tradmit.doctorcode
        `,
    },
    {
      title: "ดึง progression note เภสัช",
      query: `SELECT
 trprogressionnote.visitId as vn
 ,trvisit.hn
 ,trvisit.an
 ,trprogressionnote.S
 ,trvisitpicture.fieldData as O
 ,trvisitother.fieldData as A
 ,trprogressionnote.P
 ,trprogressionnote.createdBy AS username
 ,trprogressionnote.createDate
FROM trprogressionnote
INNER JOIN syuserrole ON trprogressionnote.createdBy=syuserrole.username
INNER JOIN trvisit ON trprogressionnote.visitId=trvisit.visitId
INNER JOIN trvisitother ON trprogressionnote.progressionNoteId=trvisitother.refId
INNER JOIN trvisitpicture ON trprogressionnote.progressionNoteId = trvisitpicture.refId
WHERE syuserrole.roleId ='3'
AND trprogressionnote.createDate BETWEEN '2024-09-01 00:00:00' AND '2024-10-31 23:59:59'
AND trprogressionnote.active ='Y'
AND trvisitother.active='Y'
AND trvisitpicture.active = 'Y'
GROUP BY progressionNoteId ;
        `,
    },
    {
      title: "รายงานสามเงา Barden scale แก้ไขจาก ฟอร์มปรอท preasure แยกกะ",
      query: `SELECT
    adm.hn,
    adm.an,
    adm.visitid AS vn,
    CONCAT(pt.title, ' ', pt.fname, ' ', pt.lname) AS ptname,
    adm.admitDate,
    vst.dischargeDatetime AS dischargeDate,

    pp.Score AS bardenscore,
        pp.status,
        pp.CreateBy as PreasureBy,
        pp.CreateDate AS PreasureDate,
        CASE
        WHEN TIME(pp.CreateDate) BETWEEN '08:00:00' AND '15:59:59' THEN 'Morning'
        WHEN TIME(pp.CreateDate) BETWEEN '16:00:00' AND '23:59:59' THEN 'Evening'
        WHEN TIME(pp.CreateDate) BETWEEN '00:00:00' AND '07:59:59' THEN 'Night'
        ELSE NULL
    END AS shift
FROM (
    --  เลือก an status ล่าสุด
    SELECT *
    FROM tradmit AS a
    WHERE a.seq = (
        SELECT MAX(b.seq)
        FROM tradmit b
        WHERE b.visitid = a.visitid
          AND b.hn = a.hn
          AND b.an = a.an
    )
) AS adm
LEFT JOIN trvisit AS vst ON adm.visitid = vst.visitid
LEFT JOIN mspatient AS pt ON adm.hn = pt.hn
INNER JOIN (
    --  เลือก bardenscore ล่าสุด
    SELECT *
    FROM frmtrpnpressure AS x
    WHERE x.trIPDTemp_PSR_ID = (
        SELECT MAX(y.trIPDTemp_PSR_ID)
        FROM frmtrpnpressure y
        WHERE y.visitid = x.visitid
    )
) AS pp ON adm.visitid = pp.visitid
WHERE DATE(adm.admitDate) BETWEEN '2025-11-01' AND '2025-11-30' ;-- วันที่admit
        `,
    },
    {
      title: "แพยท์สรุปชาร์ท",
      query: `SELECT DISTINCT
  CONCAT(msPatient.title,' ',msPatient.fname,' ',msPatient.lname) as nameipd
 ,trVisit.hn
 , trVisit.an
 , trVisit.admitDate
 , trVisit.dischargeDatetime
 ,(SELECT name FROM msrightstype WHERE rightsTypeId = trvisit.rightsTypeId) as rightstype
 ,tradmit.roomno
 ,syuser.name
FROM syWorkflowactivity
LEFT JOIN (select * from  syTransactionstatus where module = 'Flow') AS transactionstatus on syWorkflowactivity.activityStatusCode = transactionstatus.statusCode
LEFT JOIN (SELECT * FROM trVisit WHERE trVisit.active = 'Y') AS trVisit ON syWorkflowactivity.refId = trVisit.visitId
INNER JOIN syWorkFlowActivityMaster on syWorkFlowActivityMaster.workFlowActivityMasterId = syWorkflowactivity.workFlowActivityMasterId
LEFT JOIN msPatient on trVisit.hn = msPatient.hn
INNER JOIN syflowstepconfig on syWorkflowactivity.flowStepConfigId = syflowstepconfig.flowStepConfigId
INNER JOIN msRoom on msRoom.roomno = syWorkFlowActivityMaster.roomno
LEFT JOIN trvisitinformation ON trvisitinformation.visitId = trVisit.visitId
INNER JOIN syuserroom on syuserroom.roomno = syWorkFlowActivityMaster.roomno
LEFT JOIN tradmit on tradmit.visitId = trvisit.visitId
LEFT JOIN syUser on tradmit.doctorcode = syUser.username
WHERE (isCurrent = 'Y')
AND tradmit.status ='WAIT_CLOSE'
AND tradmit.doctorcode is not null
AND trVisit.walkinType = 'IPD'
AND (syWorkflowactivity.roleId= '1' OR syWorkflowactivity.roleId= '102')
AND syWorkFlowActivityMaster.roomno = 'DC_Doc'
AND (syWorkflowactivity.activityStatusCode = 'DONE')
AND dischargeDatetime BETWEEN 'date' AND 'date'
ORDER BY dischargeDatetime ;
        `,
    },
    {
      title: "แพทย์ยังไม่ได้สรุป chart",
      query: `
        SELECT DISTINCT
  CONCAT(msPatient.title,' ',msPatient.fname,' ',msPatient.lname) as nameipd
 ,trVisit.hn
 , trVisit.an
 , trVisit.admitDate
 , trVisit.dischargeDatetime
 ,(SELECT name FROM msrightstype WHERE rightsTypeId = trvisit.rightsTypeId) as rightstype
 ,tradmit.roomno
 ,syuser.name
FROM syWorkflowactivity
LEFT JOIN (select * from  syTransactionstatus where module = 'Flow') AS transactionstatus on syWorkflowactivity.activityStatusCode = transactionstatus.statusCode
LEFT JOIN (SELECT * FROM trVisit WHERE trVisit.active = 'Y') AS trVisit ON syWorkflowactivity.refId = trVisit.visitId
INNER JOIN syWorkFlowActivityMaster on syWorkFlowActivityMaster.workFlowActivityMasterId = syWorkflowactivity.workFlowActivityMasterId
LEFT JOIN msPatient on trVisit.hn = msPatient.hn
INNER JOIN syflowstepconfig on syWorkflowactivity.flowStepConfigId = syflowstepconfig.flowStepConfigId
INNER JOIN msRoom on msRoom.roomno = syWorkFlowActivityMaster.roomno
LEFT JOIN trvisitinformation ON trvisitinformation.visitId = trVisit.visitId
INNER JOIN syuserroom on syuserroom.roomno = syWorkFlowActivityMaster.roomno
LEFT JOIN tradmit on tradmit.visitId = trvisit.visitId
LEFT JOIN syUser on tradmit.doctorcode = syUser.username
WHERE (isCurrent = 'Y')
AND tradmit.status='WAIT_CLOSE'
AND tradmit.doctorcode is not null
AND trVisit.walkinType = 'IPD'
AND (syWorkflowactivity.roleId= '1' OR syWorkflowactivity.roleId= '102')
AND syWorkFlowActivityMaster.roomno = 'DC_Doc'
AND (syWorkflowactivity.activityStatusCode = 'RECHECK_REVIEW')
AND dischargeDatetime BETWEEN 'date' AND 'date'
ORDER BY dischargeDatetime;
        `,
    },
    {
      title: "รพ .บางน้ำเปรี้ยว admit IPD",
      query: `SELECT
trvisit.visitId
,trvisit.hn
,trvisit.an
,CONCAT( mspatient.title,' ',mspatient.fname,' ',mspatient.lname ) AS Name_patient
, syuser.name as Doctor
,trvisit.admitDate
,trvisit.dischargeDatetime
,trvisit.walkinType as walkinType
FROM trvisit
LEFT JOIN msPatient on trVisit.hn = msPatient.hn
LEFT JOIN tradmit on trVisit.an = tradmit.an
LEFT JOIN trorder on trorder.visitId = trvisit.visitId
LEFT JOIN trorderitem on trorderitem.orderId = trorder.orderId
INNER JOIN syuser ON syuser.username = tradmit.doctorcode
WHERE trvisit.active ='Y'
AND trvisit.walkinType = 'IPD'
AND tradmit.doctorcode IS NOT NULL
AND trvisit.admitDate BETWEEN '2025-09-05 00:00:00' and '2025-09-14 23:59:59'
AND trorderitem.source  is  null
GROUP BY trvisit.an ASC
ORDER BY trvisit.admitDate ASC ;
        `,
    },
    {
      title: "ธัญญารักษ์อุดร ขอทุกวันตอน 10 โมง (หากไม่มีข้อมูลไม่ต้องส่งให้)",
      query: `SELECT
    tradmit.hn,
    tradmit.an,
    CONCAT(mspatient.title,' ',mspatient.fname,' ',mspatient.lname) AS full_name,
    trvisit.admitDate,
    trvisit.dischargeDatetime,
    CASE WHEN DATEDIFF(trvisit.dischargeDatetime, trvisit.admitDate) = 0 THEN 1 ELSE DATEDIFF(trvisit.dischargeDatetime, trvisit.admitDate) END AS admit_day,
    tradmit.wardid,
    tradmit.ward,
    syuser.name AS doctor_name,
    diagnosis_HM.diagnosisname AS diagnosis_HM,
    diagnosis_HM.icd10 AS icd10_HM
FROM tradmit
INNER JOIN trvisit
    ON tradmit.visitId = trvisit.visitId
INNER JOIN mspatient
    ON mspatient.hn = trvisit.hn
LEFT JOIN syuser
    ON syuser.username = tradmit.doctorcode
LEFT JOIN trvisitdiagnosis AS diagnosis_HM ON  trvisit.visitId = diagnosis_HM.visitId and diagnosis_HM.active = 'Y'
and diagnosis_HM.diagnosisType ='Principal Diagnosis' and (diagnosis_HM.diagnosisname is not null AND diagnosis_HM.diagnosisname != '' )
WHERE tradmit.status in ('CLOSE','WAIT_CLOSE')
AND trvisit.dischargeDatetime >= '2026-02-08 10:00:00'
AND trvisit.dischargeDatetime <  '2026-02-09 10:00:00'
        `,
    },
    {
      title:
        "เรณูนคร  report chart รอ review จนถึงเวลาที่แพทย์กดปุ่ม End Chart",
      query: `SELECT
    syworkflowactivity.refId AS visitId,
    trvisit.an,
    trvisit.hn,
    CONCAT(mspatient.title,' ',mspatient.fname,' ',mspatient.lname) AS name,
    syworkflowactivity.createDate,
    syworkflowactivity.updateDate,
  syuser.name as doctor,

    CONCAT(
        TIMESTAMPDIFF(DAY, syworkflowactivity.createDate, syworkflowactivity.updateDate), ' วัน ',
        MOD(TIMESTAMPDIFF(HOUR, syworkflowactivity.createDate, syworkflowactivity.updateDate), 24),
        MOD(TIMESTAMPDIFF(MINUTE, syworkflowactivity.createDate, syworkflowactivity.updateDate), 60)
    ) AS duration

FROM syworkflowactivity
LEFT JOIN trvisit  ON trvisit.visitId = syworkflowactivity.refId
LEFT JOIN mspatient ON mspatient.hn = trvisit.hn
LEFT JOIN syuser ON syuser.username = syworkflowactivity.updatedBy
WHERE syworkflowactivity.flowConfigId = '14'
  AND syworkflowactivity.updateDate IS NOT NULL
 AND YEAR(syworkflowactivity.createDate) = 2025
  AND MONTH(syworkflowactivity.createDate) = 11
--  AND DAY(syworkflowactivity.createDate) = 05;
        `,
    },

    {
      title: "รายงาน แพทย์ที่สรุปชาจเกิน 7 วัน (รพ.สังฆราช๗",
      query: `
    SELECT
    syuser.name
    ,count(trvisit.an)as sum
FROM
    trvisit
INNER JOIN
    (
        SELECT
            DISTINCT an,doctorcode,status
        FROM
            tradmit
    WHERE doctorcode is not null ORDER BY an
    ) AS tradmit
   ON trvisit.an = tradmit.an
INNER JOIN
    mspatient
ON
    trvisit.hn = mspatient.hn
LEFT JOIN
    (
        SELECT
    *
FROM
    syworkflowactivity AS swa
WHERE
    flowConfigId = '14'
--     AND activityStatusCode IN ('DONE', 'CLOSE','NEW','WAIT')
    AND process = 'Chart รอ Review (แพทย์)'
    AND seq = (
        SELECT
            MAX(seq)
        FROM
            syworkflowactivity AS sub
        WHERE
            sub.refid = swa.refid
            AND sub.flowConfigId = '14'
--             AND sub.activityStatusCode IN ('DONE', 'CLOSE','NEW','WAIT')
            AND sub.process = 'Chart รอ Review (แพทย์)'
    )
    ) AS doctor
ON
    trvisit.visitId = doctor.refId
LEFT JOIN syuser on tradmit.doctorcode = syuser.username
WHERE
    trvisit.an <> ''
    AND trvisit.an IS NOT NULL
    AND trvisit.dischargeDatetime BETWEEN '2025-06-01 00:00:00' AND '2025-06-30 23:59:59'
    AND TIMESTAMPDIFF(DAY, trvisit.dischargeDatetime, doctor.startTimeActivity) >= 7
    AND tradmit.status IN ('WAIT_CLOSE','CLOSE')
     GROUP BY
    syuser.name
ORDER BY
    trvisit.dischargeDatetime , trvisit.an
   ;
    `,
    },
    {
      title: "รายงาน Note chart",
      query: `select
trvisit.visitId,
trvisit.an,
trvisit.hn,
CONCAT_WS(' ',mspatient.title,mspatient.fname,mspatient.lname) as patient_name,
trvisit.admitInDatetime,
trnote.message as Note,
syuser.name as UpdateBy,
trnote.updateDate as NoteDatetime
from
trvisit
LEFT JOIN mspatient ON trvisit.hn = mspatient.hn
LEFT JOIN trnote ON trvisit.visitid = trnote.visitId
LEFT JOIN syuser ON trnote.updatedBy = syuser.username
WHERE trnote.status = 'Checked' AND DATE(trvisit.admitInDatetime) between '2025-01-01' AND '2025-01-31' order by trvisit.visitid asc
    `,
    },
    {
      title: "มะขาม Hosxp. ขอรายงานจำนวนคนไข้ที่ติดป้าย MED",
      query: `-- จำนวนคนไข้ที่ติดป้ายMED
SELECT
count(trnote.an)
FROM trnote
LEFT JOIN mspatient on trnote.hn = mspatient.hn
LEFT JOIN trvisit on trvisit.visitId = trnote.visitId
WHERE trnote.createDate
BETWEEN '2024-10-01 00:00:00' and '2025-09-30 23:59:59' and message ='med'
and trvisit.visitId is not null
 ;
-- จำนวนครั้ง และมีช่องรวมจำนวน field : hn , an , visitid , ชื่อนามสกุลคนไข้ , วันที่แอดมิด
SELECT
trnote.hn
,trnote.an
,trvisit.visitId
,CONCAT(mspatient.title,mspatient.fname,' ',mspatient.lname) as name
,trvisit.admitDate
,count(trnote.an)
FROM trnote
LEFT JOIN mspatient on trnote.hn = mspatient.hn
LEFT JOIN trvisit on trvisit.visitId = trnote.visitId
WHERE trnote.createDate
BETWEEN '2024-10-01 00:00:00' and '2025-09-30 23:59:59' and message ='med'
and trvisit.visitId is not null
GROUP BY an
    `,
    },
    {
      title:
        "AUDIT RW IPD (NO DUPLICATE VERSION) แก้ปัญหา Record ซ้ำจาก trvisitdetail (จัตุรัส)",
      query: `/* ============================================================
CTE กลาง ใช้ร่วมทุก Report
============================================================ */
WITH rw AS (
    SELECT
        visitId,
        MAX(CAST(value AS DECIMAL(10,2))) AS RW
    FROM trvisitdetail
    WHERE parameter = 'adjrw'
    GROUP BY visitId
),

audit_pass AS (
    SELECT DISTINCT visitId
    FROM trvisitdetail
    WHERE parameter = 'AuditorCheck'
      AND value = 'Y'
)


/* ============================================================
1) ผ่าน Audit : ต.ค.68 - มี.ค.69
============================================================ */
SELECT
    tv.hn AS HN,
    tv.an AS AN,
    CONCAT(mp.title,' ',mp.fname,' ',mp.lname) AS full_name,
    tv.admitInDatetime AS admit_date,
    tv.dischargeDatetime AS dc_date,
    COALESCE(rw.RW,0) AS RW,
    tv.lengthofstay AS วันนอน,
    CONCAT('Dr. ',sy.name) AS Doctor_Name
FROM trvisit tv
LEFT JOIN mspatient mp
       ON tv.hn = mp.hn
LEFT JOIN syuser sy
       ON tv.doctorcode = sy.doctorcode
LEFT JOIN rw
       ON tv.visitId = rw.visitId
INNER JOIN audit_pass ap
       ON tv.visitId = ap.visitId
WHERE tv.admitInDatetime >= '2025-10-01'
  AND tv.admitInDatetime <  '2026-04-01'
ORDER BY tv.admitInDatetime;



/* ============================================================
SUMMARY
============================================================ */
WITH rw AS (
    SELECT visitId,
           MAX(CAST(value AS DECIMAL(10,2))) AS RW
    FROM trvisitdetail
    WHERE parameter='adjrw'
    GROUP BY visitId
),
audit_pass AS (
    SELECT DISTINCT visitId
    FROM trvisitdetail
    WHERE parameter='AuditorCheck'
      AND value='Y'
)
SELECT
    COUNT(*) AS total_case,
    SUM(COALESCE(rw.RW,0)) AS total_RW
FROM trvisit tv
LEFT JOIN rw
       ON tv.visitId = rw.visitId
INNER JOIN audit_pass ap
       ON tv.visitId = ap.visitId
WHERE tv.admitInDatetime >= '2025-10-01'
  AND tv.admitInDatetime < '2026-04-01';



/* ============================================================
2) ไม่ผ่าน Audit : ต.ค.68 - มี.ค.69
(ไม่มี AuditorCheck)
============================================================ */
WITH rw AS (
    SELECT
        visitId,
        MAX(CAST(value AS DECIMAL(10,2))) AS RW
    FROM trvisitdetail
    WHERE parameter='adjrw'
    GROUP BY visitId
)

SELECT
    tv.hn AS HN,
    tv.an AS AN,
    CONCAT(mp.title,' ',mp.fname,' ',mp.lname) AS full_name,
    tv.admitInDatetime AS admit_date,
    tv.dischargeDatetime AS dc_date,
    COALESCE(rw.RW,0) AS RW,
    tv.lengthofstay AS วันนอน,
    CONCAT('Dr. ',sy.name) AS Doctor_Name
FROM trvisit tv
LEFT JOIN mspatient mp
       ON tv.hn = mp.hn
LEFT JOIN syuser sy
       ON tv.doctorcode = sy.doctorcode
LEFT JOIN rw
       ON tv.visitId = rw.visitId
WHERE tv.admitInDatetime >= '2025-10-01'
  AND tv.admitInDatetime <  '2026-04-01'
  AND NOT EXISTS (
        SELECT 1
        FROM trvisitdetail x
        WHERE x.visitId = tv.visitId
          AND x.parameter = 'AuditorCheck'
  )
ORDER BY tv.admitInDatetime;



/* ============================================================
SUMMARY
============================================================ */
WITH rw AS (
    SELECT
        visitId,
        MAX(CAST(value AS DECIMAL(10,2))) AS RW
    FROM trvisitdetail
    WHERE parameter='adjrw'
    GROUP BY visitId
)

SELECT
    COUNT(*) AS total_case,
    SUM(COALESCE(rw.RW,0)) AS total_RW
FROM trvisit tv
LEFT JOIN rw
       ON tv.visitId = rw.visitId
WHERE tv.admitInDatetime >= '2025-10-01'
  AND tv.admitInDatetime <  '2026-04-01'
  AND NOT EXISTS (
        SELECT 1
        FROM trvisitdetail x
        WHERE x.visitId = tv.visitId
          AND x.parameter='AuditorCheck'
  );



/* ============================================================
3) ผ่าน Audit : เม.ย.69 - ปัจจุบัน
============================================================ */
WITH rw AS (
    SELECT
        visitId,
        MAX(CAST(value AS DECIMAL(10,2))) AS RW
    FROM trvisitdetail
    WHERE parameter='adjrw'
    GROUP BY visitId
),
audit_pass AS (
    SELECT DISTINCT visitId
    FROM trvisitdetail
    WHERE parameter='AuditorCheck'
      AND value='Y'
)

SELECT
    tv.hn AS HN,
    tv.an AS AN,
    CONCAT(mp.title,' ',mp.fname,' ',mp.lname) AS full_name,
    tv.admitInDatetime AS admit_date,
    tv.dischargeDatetime AS dc_date,
    COALESCE(rw.RW,0) AS RW,
    tv.lengthofstay AS วันนอน,
    CONCAT('Dr. ',sy.name) AS Doctor_Name
FROM trvisit tv
LEFT JOIN mspatient mp
       ON tv.hn = mp.hn
LEFT JOIN syuser sy
       ON tv.doctorcode = sy.doctorcode
LEFT JOIN rw
       ON tv.visitId = rw.visitId
INNER JOIN audit_pass ap
       ON tv.visitId = ap.visitId
WHERE tv.admitInDatetime >= '2026-04-01'
ORDER BY tv.admitInDatetime;`,
    },
    {
      title: "report ยา  Urgent รพ.สามชุก",
      query: `SELECT
   ti.orderItemId,
    ti.itemname,
    ti.createDate AS เวลาสั่ง_order,
    ti.updateDate AS เวลาจ่าย,
    SEC_TO_TIME(TIMESTAMPDIFF(SECOND, ti.createDate, ti.updateDate)) AS เวลาจ่ายยา_response_time_hmss,
    COALESCE(tk.time, 'ไม่ได้ลงเวลาให้ยา') AS เวลา_kardex,
    CASE
        WHEN tk.time IS NULL THEN 'ไม่ได้ลงเวลาให้ยา'
        ELSE SEC_TO_TIME(TIMESTAMPDIFF(SECOND, ti.createDate, tk.time))
    END AS เวลาให้ยา_response_time_hms,
    ti.itemtype,
    ti.status

FROM trorderitem ti
LEFT JOIN trorder t ON ti.orderId = t.orderId
LEFT JOIN trvisit tv ON t.visitId = tv.visitId AND tv.active = 'Y'
LEFT JOIN trorderitemplan tip ON ti.orderItemId = tip.orderItemId
LEFT JOIN (
    SELECT
        orderItemPlanId,
        time,
        ROW_NUMBER() OVER (PARTITION BY orderItemPlanId ORDER BY time ASC) AS rn
    FROM trkardex
) tk ON tip.orderItemPlanId = tk.orderItemPlanId AND tk.rn = 1
WHERE ti.orderFeature = 'Urgent'
    AND ti.active = 'Y'
    AND ti.orderitemIdSummary IS NULL
    AND ti.itemtype IN ('Drug', 'IV Fuild')
    AND t.orderId IS NOT NULL
    AND tv.visitId IS NOT NULL
    AND YEAR(ti.createDate) = 2026
    AND MONTH(ti.createDate) = 1
ORDER BY ti.createDate DESC;`,
    },
    {
      title: "รายงานผู้ป่วยตึกICU วันนอน3วันขึ้นไป (พนมสารคาม)",
      query: `SELECT trvisit.visitId
    ,trvisit.hn
    ,trvisit.an
    ,CONCAT(mspatient.title,' ',mspatient.fname,' ',mspatient.lname) AS Name_patient
    ,trvisit.admitDate
    ,trvisit.admitInDatetime
    ,trvisit.dischargeDatetime
    ,trvisit.lengthOfStay as LOS
FROM trvisit
LEFT JOIN msPatient
    ON trVisit.hn = msPatient.hn
LEFT JOIN tradmit
    ON trVisit.an = tradmit.an
WHERE trvisit.active = 'Y'
and trvisit.lengthOfStay > '2'
and tradmit.wardId ='06'
AND trvisit.admitInDatetime BETWEEN '2026-01-01 00:00:00' AND '2026-03-31 23:59:59'
GROUP BY trvisit.visitId;`,
    },
    {
      title:
        " Report  chart ที่ตรวจสอบแล้ว ที่ยังอยู่ที่รอรรีวิว (ตระการพืชผล)",
      query: `SELECT
trvisit.hn,
trvisit.an,
trvisit.admitDate,
trvisit.dischargeDatetime
FROM syworkflowactivity
LEFT JOIN trvisitdetail on syworkflowactivity.refId = trvisitdetail.visitId
LEFT JOIN trvisit on trvisit.visitId = syworkflowactivity.refId
WHERE syworkflowactivity.process ='Chart รอ Review'
and syworkflowactivity.activityStatusCode ='WAIT'
and syworkflowactivity.isCurrent ='Y'
and trvisitdetail.module ='Review Chart'
and trvisitdetail.parameter ='CoderStatus' and trvisitdetail.value ='DONE'
and trvisit.admitDate BETWEEN '2026-03-01 00:00:00' and '2026-04-02 23:59:59'`,
    },
    {
      title:
        "Report ขอรายงานช่อง progress note ที่มีข้อความ pharm'note,Pharmacist,Pharmacist' note และ diagnosis",
      query: `SELECT
t1.visitId,
trvisit.hn,
trvisit.an,
CONCAT(mspatient.title,mspatient.fname,' ',mspatient.lname) as name,
trvisit.admitDate,
trvisit.dischargeDatetime,
trvisitdiagnosis.icd10,
trvisitdiagnosis.doctordiagnosis
FROM (SELECT * from trprogressionnote
WHERE S like 'Pharm note:%'
or S like '%Pharmacist%'
or S like '%diagnosis%' )as t1
LEFT JOIN trvisit on  trvisit.visitId = t1.visitId
LEFT JOIN mspatient on trvisit.hn = mspatient.hn
left JOIN trvisitdiagnosis on trvisitdiagnosis.visitid = t1.visitId
WHERE t1.createDate BETWEEN '2026-01-01 00:00:00' and '2026-02-28 23:59:59'
and trvisitdiagnosis.diagnosisType = 'Principal Diagnosis' and trvisitdiagnosis.formType = 'Clinical Summary' ;`,
    },
    {
      title: "MR ฉวาง แพทย์กด MR",
      query: `SELECT
trvisit.hn
, trvisit.an
, CONCAT(mspatient.fname, ' ', mspatient.lname) AS full_name
, trreconcile.itemname
, trreconcile.administration
, trvisit.admitDate
, RcreatedBy.name
, trreconcile.createDate
, IF(RupdatedBy.name=RcreatedBy.name,'',RupdatedBy.name) AS doctor
, CASE
      WHEN RupdatedBy.name IS NULL OR RupdatedBy.name = RcreatedBy.name
      THEN ''
      ELSE trreconcile.updateDate
  END AS updateDate
, trreconcile.status
, trvisit.dischargeDatetime
FROM trreconcile
LEFT JOIN trvisit ON trreconcile.visitId = trvisit.visitId
LEFT JOIN mspatient ON trvisit.hn = mspatient.hn
LEFT JOIN syuser AS RcreatedBy ON trreconcile.createdBy = RcreatedBy.username
LEFT JOIN syuser AS RupdatedBy ON trreconcile.updatedBy = RupdatedBy.username
WHERE trvisit.admitDate
BETWEEN '2025-10-01 00:00:00'
AND '2025-12-31 23:59:59'
ORDER BY trreconcile.visitId , trreconcile.createDate`,
    },
    {
      title: "รพ.นาด้วง รายงาน ฟอร์ม PSS/falling ในฟอร์มปรอท",
      query: `SELECT
trvisit.hn
,trvisit.an
,trvisit.visitId
,CONCAT(mspatient.title,mspatient.fname,' ',mspatient.lname) as name
,frmtrpnfallingrisks.Q1
,frmtrpnfallingrisks.Q2
,frmtrpnfallingrisks.Q3
,frmtrpnfallingrisks.Q4
,frmtrpnfallingrisks.Q5
,frmtrpnfallingrisks.Q6
,frmtrpnfallingrisks.Score
,frmtrpnfallingrisks.status
,syuser.name
FROM frmtrpnfallingrisks
LEFT JOIN trvisit on trvisit.visitId = frmtrpnfallingrisks.visitId
LEFT JOIN mspatient on trvisit.hn = mspatient.hn
LEFT JOIN syuser on syuser.username = frmtrpnfallingrisks.CreateBy
WHERE frmtrpnfallingrisks.CreateDate BETWEEN '2023-07-17 13:55:40' and '2025-12-31 23:59:59'`,
    },
    {
      title: "รพ.แหลมสิงห์ ดึงข้อมูลลงเวลาให้ยานอกเวลา",
      query: `SELECT
trvisit.hn
,trvisit.an
,trvisit.visitId
,CONCAT(mspatient.title,mspatient.fname,' ',mspatient.lname) as name
,trorderitemplan.itemname
,syuser.name
,emarDate
FROM trkardex
LEFT JOIN trorderitemplan on trkardex.orderItemPlanId = trorderitemplan.orderItemPlanId
LEFT JOIN trvisit on trvisit.visitId = trorderitemplan.visitId
LEFT JOIN mspatient on trvisit.hn = mspatient.hn
LEFT JOIN syuser on syuser.username = trkardex.emarBy
WHERE giveMed ='OverTime' and emarDate BETWEEN '2024-10-01 00:00:00' and now()`,
    },
    {
      title: "รายงานระยะเวลาสรุป chart Doctor , Coder , Audit ควนกาหลง",
      query: `SELECT
    tv.visitId,
    tv.an,
    tv.hn,

    CONCAT(
        mp.title,' ',
        mp.fname,' ',
        mp.lname
    ) AS patient_name,

    doctor_review.doctor_complete_date,

    TIMESTAMPDIFF(
        DAY,
        tv.dischargeDatetime,
        doctor_review.doctor_complete_date
    ) AS doctor_days,

    audit_send.audit_send_date,

    audit_complete.audit_complete_date,

    TIMESTAMPDIFF(
        DAY,
        audit_send.audit_send_date,
        audit_complete.audit_complete_date
    ) AS audit_days,

    coding.coding_date,

    TIMESTAMPDIFF(
        DAY,
        audit_complete.audit_complete_date,
        coding.coding_date
    ) AS coding_after_audit_days,

    CASE
        WHEN audit_complete.audit_complete_date IS NULL
        THEN 'N'
        ELSE 'Y'
    END AS has_audit

FROM trvisit tv

LEFT JOIN mspatient mp
    ON tv.hn = mp.hn

LEFT JOIN (
    SELECT
        refId,
        MAX(updateDate) AS doctor_complete_date
    FROM syworkflowactivity
    WHERE flowConfigId = 14
      AND activityStatusCode IN ('DONE','CLOSE')
      AND updateDate IS NOT NULL
    GROUP BY refId
) doctor_review
    ON doctor_review.refId = tv.visitId

LEFT JOIN (
    SELECT
        refId,
        MIN(updateDate) AS audit_send_date
    FROM syworkflowactivity
    WHERE flowConfigId = 13
      AND activityStatusCode IN ('DONE','CLOSE')
      AND updateDate IS NOT NULL
    GROUP BY refId
) audit_send
    ON audit_send.refId = tv.visitId

LEFT JOIN (
    SELECT
        refId,
        MAX(updateDate) AS audit_complete_date
    FROM syworkflowactivity
    WHERE flowConfigId = 18
      AND activityStatusCode IN ('DONE','CLOSE')
      AND updateDate IS NOT NULL
    GROUP BY refId
) audit_complete
    ON audit_complete.refId = tv.visitId

LEFT JOIN (
    SELECT
        visitId,
        MIN(updateDate) AS coding_date
    FROM trvisitdiagnosis
    WHERE active = 'Y' AND activeRoleId = '104'
    GROUP BY visitId
) coding
    ON coding.visitId = tv.visitId

WHERE tv.an IS NOT NULL
  AND tv.admitDate BETWEEN '2026-04-01' AND '2026-04-30'

ORDER BY tv.admitDate DESC;`,
    },
    {
      title: "รายการ comment รพ.ราษีไศล",
      query: `SELECT
    tv.hn,
    tv.an,

    CONCAT(
        mp.title,' ',
        mp.fname,' ',
        mp.lname
    ) AS patient_name,

    tv.admitDate,
    tv.dischargeDatetime,

    ROW_NUMBER() OVER (
        PARTITION BY tv.an
        ORDER BY c.createDate
    ) AS seq,

    c.message AS comment,
    c.createDate AS comment_date,

    u.username AS comment_by_username,
    u.name AS comment_by_name,
    u.entryPosition AS comment_by_position

FROM sychat c

INNER JOIN trvisit tv
    ON tv.visitId = c.toVisitId

LEFT JOIN mspatient mp
    ON mp.hn = tv.hn

LEFT JOIN syuser u
    ON u.username = c.updatedBy

WHERE c.active = 'Y'
  AND c.title = 'Comment'
  AND tv.an IS NOT NULL
  AND c.createDate >= '2026-01-01'
  AND c.createDate < '2026-06-01'

ORDER BY
    tv.an,
    c.createDate ASC;`,
    },
    {
      title: "",
      query: ``,
    },
  ],
  utility: [
    {
      title: "Too many connections",
      query: `
show variables like 'max_connections'
SET global max_connections = 500

-- หมายเหตุ
-- + ได้ที่ละ 100-200 ตามขนาด server
      `,
    },
    {
      title: "Query Drive D ของโรงพยาบาล เต็ม",
      query: `
        -- คำสั่งตรวจสอบแสดงข้อมูล binary log
        show binary logs;
     -- แสดงวันหมดอายุ expire_logs ถ้าเป็น 0 แสดงว่าไม่มีการกำหนด วันหมดอายุของไฟล์ binary log
        show variables like 'expire_logs%';
     -- กำหนดวันหมดอายุ binary log
        set global expire_logs_days = 7;
     -- ลบ binary log ที่มีอายุเกินกว่าที่กำหนด
        flush logs;
        `,
    },
    {
      title: "แก้ปัญหา CUP 100% (แบบแก้ขัด)",
      query: `SELECT CONCAT('KILL ',id,';')
FROM information_schema.processlist
WHERE state='Sending data'
AND info LIKE 'SELECT syWorkflowactivity.workflowactivityId%';
        `,
    },
    {
      title: "ดึงกลับ Review (พนมสารคาม)",
      query: `
        CREATE TEMPORARY TABLE visitIdReview AS
SELECT
    visitId
FROM
    trvisit
WHERE
    an IN ();

UPDATE trvisit
SET
    status = 'WAIT_CLOSE'
WHERE
    visitId IN (
        SELECT
            visitId
        FROM
            visitIdReview
    );

update tradmit
set
    status = 'WAIT_CLOSE'
where
    visitId in (
        SELECT
            visitId
        FROM
            visitIdReview
    )
    and status = 'CLOSE';

update syworkflowactivitymaster
set
    statusCode = 'NEW'
where
    visitId in (
        SELECT
            visitId
        FROM
            visitIdReview
    )
    and flowConfigId = '13';

UPDATE syworkflowactivity t1
JOIN (
    SELECT
        workFlowActivityId,
        refId,
        flowConfigId,
        process
    FROM
        (
            SELECT
                workFlowActivityId,
                refId,
                flowConfigId,
                process,
                ROW_NUMBER() OVER (
                    PARTITION BY
                        refId
                    ORDER BY
                        workFlowActivityId DESC
                ) AS rn
            FROM
                syworkflowactivity
            WHERE
                refId in (
                    SELECT
                        visitId
                    FROM
                        visitIdReview
                )
                AND flowConfigId = '13'
                AND process IN (
                    'Chart รอ Review',
                    'Chart ส่งคืนแพทย์',
                    'Chart เสร็จสิ้น'
                )
        ) AS subquery
    WHERE
        rn <= 3
) AS t2 ON t1.workFlowActivityId = t2.workFlowActivityId
SET
    t1.activityStatusCode = CASE
        WHEN t1.process = 'Chart รอ Review' THEN 'WAIT'
        WHEN t1.process IN ('Chart ส่งคืนแพทย์', 'Chart เสร็จสิ้น') THEN 'NEW'
    END;

DROP TEMPORARY TABLE visitIdReview;
        `,
    },
    {
      title: "ข้อมูล ฟอร์มปรอท",
      query: `1 คะแนน
1. ความถี่ของการสังเกตุอาการอย่างน้อยทุก 8 ชั่วโมงเฝ้าระวังตามมาตรฐานการพยาบาล

2 คะแนน
1. ความถี่ของการสังเกตุอาการอย่างน้อยทุก 2 ชั่วโมงติดต่อกัน 3 ครั้ง
2. ถ้า MEWS score เท่ากับ 3 ติดต่อกัน 3 ครั้งควรรายงานพยาบาลหัวหน้าเวรให้การดูแลกิจกรรมการพยาบาลตามอาการ ตามความเหมาะสม

3 คะแนน
1. รายงานพยาบาลหัวหน้าเวรเพื่อพิจารณารายงานแพทย์
2. ความถี่ของการสังเกตุอาการอย่างน้อยทุก 2 ชั่วโมงติดต่อกัน 3 ครั้ง
3. ถ้า MEWS score เท่ากับ 4 ติดต่อกัน 3 ครั้ง รายงานพยาบาลหัวหน้าเวร ให้การดูแลกิจกรรมการพยาบาลตามอาการ ตามความเหมาะสม
4. พิจารณาเพื่มการบันทึกปริมาณน้ำเข้า-ออกให้ถี่ขึ้นเป็นทุก 4 ชั่วโมง ถ้าน้อยกว่า 100 ใน 4 ชั่วโมง รายงานแพทย์ทันที
5. พิจารณาย้ายผู้ป่วยมาดูแลใกล้ nurse station

4 คะแนน
1. รายงานพยาบาลหัวหน้าเวรเพื่อประเมินคะแนน MEWS ผู้ป่วยซ้ำ
2. พยาบาลควรรีบขอความช่วยเหลือจากทีม rapid response team และรายงานอาการผู้ป่วยต่อทีมให้ สังเกต อาการผู้ป่วยพิจารณาย้ายผู้ป่วยมาดูแลใกล้ nurse station
3. เพื่มความถี่ของการสังเกตอาการเป้นทุก 1 ชั่วโมงติดต่อกัน 3 ครั้ง
4. ถ้า MEWS score เท่ากับ 5 ติดต่อกัน 3 ครั้ง พยาบาลควรปรึกษาแพทย์ ในการพิจารณาย้ายผู้ป่วยเข้าหอผู้ป่วยวิกฤต

5 คะแนน
1. รายงานพยาบาลหัวหน้าเวรเพื่อประเมินคะแนน MEWS ผู้ป่วยซ้ำ
2. พยาบาลควรรีบขอความช่วยเหลือจากทีม repid response team และรายงานแพทย์ทันที
3. พยาบาลควรปรึกษาแพทย์ในการพิจารณาย้ายผู้ป่วยเข้าหอผู้ป่วยวิกฤต`,
    },
    {
      title: "รวมอะไรสักอย่างนี่แหละ",
      query: `
        -- หนองหญ้าไซ : nys11296
        -- เดิมบาง : dbnb11289
        -- ด่านช้าง : dch11290
        -- ดอนเจดีย์ : djd11293
        -- ศรีประจันทร์ : spj11292
        -- อู่ทอง : ut11295
        -- สังฆราช : sd1710733
      `,
    },
  ],
};
