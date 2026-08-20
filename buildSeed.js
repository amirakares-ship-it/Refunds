import fs from 'fs';

const rawText = `No.,Company,Client name,National ID,Membership_ID,Customer ID,Acceptance Date,Acceptance Year,Amount,Type,Request Date,Request Month,Send Date,CS Feedback,Feedback Category,Reachable,CS Date,Action,Action Date,Status,Is Cancellation Outcome,Cancellation Date,Reactive,Days
1,Ollin,Wael Gad Fayak Shehata ,28407020104838,288063,1000369385,2024-11-19,2024,82409.0,default,2026-01-12,2026-01,2026-01-13,Willing to continue payments,Willing to continue payments,True,2026-01-14,Sent to company,2026-01-15,Cancelled,True,2026-03-09,Reactive,1.0
2,Ollin,Magdy Mohamed Abdelalim Moohamed,28701092700031,290035,1000371342,2024-12-02,2024,134199.0,default,2026-01-12,2026-01,2026-01-13,Issue with financing company but willing to pay,Issue with financing co. (willing),True,2026-01-14,Sent to company,2026-01-15,Cancelled,True,2026-03-09,,1.0
3,Ollin,Yara Mahmoud Elbadry,29101251100209,278873,1000370917,2024-12-02,2024,196941.0,default,2026-01-12,2026-01,2026-01-13,Willing to continue payments,Willing to continue payments,True,2026-01-14,Sent to company,2026-01-15,Cancelled,True,2026-03-09,Reactive,1.0
`;
