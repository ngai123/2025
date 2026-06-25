@echo off
echo Renaming long filenames...
echo.

REM Rename Attached book
if exist "Attached_ The New Science of Adult Attachment and How It Can -- Amir Levine and Rachel Heller -- Penguin Random House LLC, New York, 2010 -- Jeremy P_ -- 9781101466827 -- 5f8407a064ddf4655bfe92e86cac6932 -- Anna's A.pdf" (
    ren "Attached_ The New Science of Adult Attachment and How It Can -- Amir Levine and Rachel Heller -- Penguin Random House LLC, New York, 2010 -- Jeremy P_ -- 9781101466827 -- 5f8407a064ddf4655bfe92e86cac6932 -- Anna's A.pdf" "Attached.pdf"
    echo Renamed: Attached.pdf
) else (
    echo Attached.pdf already renamed or not found
)

REM Rename Hold Me Tight book
if exist "Hold Me Tight _ Seven Conversations for a Lifetime of Love -- Sue Johnson - undifferentiated, Sue Johnson -- Hachette Book Group, New York, 2008 -- 9780316031998 -- 2a516a70e5a36a4cf100bc8f3a753c63 -- Anna's Arc (1).pdf" (
    ren "Hold Me Tight _ Seven Conversations for a Lifetime of Love -- Sue Johnson - undifferentiated, Sue Johnson -- Hachette Book Group, New York, 2008 -- 9780316031998 -- 2a516a70e5a36a4cf100bc8f3a753c63 -- Anna's Arc (1).pdf" "Hold_Me_Tight.pdf"
    echo Renamed: Hold_Me_Tight.pdf
) else (
    echo Hold_Me_Tight.pdf already renamed or not found
)

echo.
echo Done! Files renamed successfully.
echo You can now restart the server.
pause
