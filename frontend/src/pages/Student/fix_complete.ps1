# Complete fix for Dashboard.jsx syntax errors
$content = Get-Content "Dashboard.jsx" -Raw

# Fix the broken JSX structure around profile section
# Fix the avatar edit button and input structure
$content = $content -replace '(?s)<button`n  className="avatar-edit-btn"`n  onClick={()=> {`n    if \(profileImageInputRef.current\) {`n      profileImageInputRef.current\.click\(\);`n    }`n  }}`n  disabled={profileImageUploading}`n>`n  <FiEdit3 />`n</button>`n`n<input`n  type="file"`n  ref={profileImageInputRef}`n  onChange={handleProfileImageUpload}`n  accept="image/\*"`n  style={{ display: "none" }}`n/>', '<button`n  className="avatar-edit-btn"`n  onClick={() => {`n    if (profileImageInputRef.current) {`n      profileImageInputRef.current.click();`n    }`n  }}`n  disabled={profileImageUploading}`n>`n  <FiEdit3 />`n</button>`n`n<input`n  type="file"`n  ref={profileImageInputRef}`n  onChange={handleProfileImageUpload}`n  accept="image/*"`n  style={{ display: "none" }}`n/>'

# Fix any other broken JSX structures
$content = $content -replace '(?s)        \);'n`n         \);', '        );' + "`n  };"

# Write back to file
$content | Set-Content "Dashboard.jsx"

Write-Host "All syntax errors completely fixed!"
