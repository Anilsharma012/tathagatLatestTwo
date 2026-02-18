import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout/AdminLayout';
import axios from 'axios';
import { toast } from 'react-toastify';

const CounselingEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEnquiries = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const { data } = await axios.get('/api/enquiries', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setEnquiries(data.enquiries);
      }
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      toast.error('Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  return (
    <AdminLayout>
      <div className="crm-container">
        <div className="crm-header" style={{ marginBottom: '20px' }}>
          <h1>Counseling Enquiries</h1>
          <p className="muted">Enquiries from the "Free Counseling" button on the home page</p>
        </div>
        {loading ? (
          <div className="ph-banner" role="status">Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>City</th>
                  <th>Message</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => (
                  <tr key={enquiry._id}>
                    <td>{enquiry.name}</td>
                    <td>{enquiry.phone}</td>
                    <td>{enquiry.email}</td>
                    <td>{enquiry.address}</td>
                    <td title={enquiry.message}>
                      {enquiry.message.length > 30 ? enquiry.message.substring(0, 30) + '...' : enquiry.message}
                    </td>
                    <td>{new Date(enquiry.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {enquiries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '20px' }}>
                      No enquiries found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CounselingEnquiries;
