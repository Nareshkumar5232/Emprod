import pandas as pd
import random

data=[]

for _ in range(1000):

    commits=random.randint(0,100)
    prs=random.randint(0,20)
    issues=random.randint(0,15)
    reviews=random.randint(0,10)

    score=commits+prs*2+issues*2+reviews

    if score>90:
        productivity="High"
    elif score>40:
        productivity="Medium"
    else:
        productivity="Low"

    data.append([
        commits,
        prs,
        issues,
        reviews,
        productivity
    ])

df=pd.DataFrame(
    data,
    columns=[
        "commits",
        "prs",
        "issues",
        "reviews",
        "productivity"
    ]
)

df.to_csv(
    "employee_productivity.csv",
    index=False
)

print("Dataset Created")